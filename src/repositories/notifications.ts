import { getDb } from '../database/client/index';
import {
  productVariants,
  products,
  customers,
  suppliers,
  cashSessions,
} from '../database/schema/index';
import { eq, and, gt, sql, desc } from 'drizzle-orm';
import type { AppNotification, NotificationFilter } from '../shared/types/notifications';
import { getSetting, setSetting } from './settings';
import { getVariantStock } from './inventory';

const READ_NOTIFICATIONS_KEY = 'system.read_notifications';
const DISMISSED_NOTIFICATIONS_KEY = 'system.dismissed_notifications';

function getReadNotificationIds(): Set<string> {
  try {
    const raw = getSetting(READ_NOTIFICATIONS_KEY as any) as string[] | undefined;
    return new Set(Array.isArray(raw) ? raw : []);
  } catch {
    return new Set();
  }
}

function getDismissedNotificationIds(): Set<string> {
  try {
    const raw = getSetting(DISMISSED_NOTIFICATIONS_KEY as any) as string[] | undefined;
    return new Set(Array.isArray(raw) ? raw : []);
  } catch {
    return new Set();
  }
}

/**
 * Generate active real-world notifications from actual SQLite system state.
 */
export function generateSystemNotifications(): AppNotification[] {
  const db = getDb();
  const readIds = getReadNotificationIds();
  const dismissedIds = getDismissedNotificationIds();
  const notifications: AppNotification[] = [];

  const now = new Date().toISOString();

  // 1. Low Stock & Out of Stock Alerts
  const enableStockAlerts = (getSetting('notifications.enable_stock_alerts' as any) as boolean ?? true) &&
    (getSetting('inventory.enable_low_stock_alerts' as any) as boolean ?? true);
  const defaultLowThreshold = Number(getSetting('inventory.low_stock_threshold' as any) || 5000);

  if (enableStockAlerts) {
    try {
      const variants = db
        .select({
          id: productVariants.id,
          variant_name: productVariants.variant_name,
          product_name: products.name,
          min_stock_alert: productVariants.min_stock_alert,
        })
        .from(productVariants)
        .innerJoin(products, eq(productVariants.product_id, products.id))
        .where(and(eq(productVariants.is_active, true), eq(products.is_active, true)))
        .all();

      let outOfStockCount = 0;
      let lowStockCount = 0;

      for (const v of variants) {
        const stock = getVariantStock(v.id);
        const effectiveThreshold = v.min_stock_alert > 0 ? v.min_stock_alert : defaultLowThreshold;
        if (stock.current_stock <= 0) {
          outOfStockCount++;
        } else if (effectiveThreshold > 0 && stock.current_stock <= effectiveThreshold) {
          lowStockCount++;
        }
      }

      if (outOfStockCount > 0) {
        const id = 'stock-out-summary';
        notifications.push({
          id,
          category: 'out_of_stock',
          severity: 'error',
          title: 'Out of Stock Alert',
          message: `${outOfStockCount.toString()} active product variant(s) are completely out of stock.`,
          route: '/inventory',
          created_at: now,
          is_read: readIds.has(id),
          is_dismissed: dismissedIds.has(id),
        });
      }

      if (lowStockCount > 0) {
        const id = 'stock-low-summary';
        notifications.push({
          id,
          category: 'low_stock',
          severity: 'warning',
          title: 'Low Stock Alert',
          message: `${lowStockCount.toString()} active product variant(s) are running below minimum alert threshold.`,
          route: '/inventory',
          created_at: now,
          is_read: readIds.has(id),
          is_dismissed: dismissedIds.has(id),
        });
      }
    } catch {
      // Non-blocking
    }
  }

  // 2. Customer Khata Over-Limit Alerts
  const enableCreditAlerts = (getSetting('notifications.enable_credit_alerts' as any) as boolean ?? true);
  if (enableCreditAlerts) {
    try {
      const overLimitCustomers = db
        .select({
          id: customers.id,
          name: customers.name,
          balance: customers.current_balance_minor,
          limit: customers.credit_limit_minor,
        })
        .from(customers)
        .where(
          and(
            eq(customers.is_active, true),
            gt(customers.current_balance_minor, customers.credit_limit_minor),
          ),
        )
        .all();

      for (const cust of overLimitCustomers) {
        const id = `cust-limit-${String(cust.id)}`;
        notifications.push({
          id,
          category: 'customer_credit',
          severity: 'warning',
          title: 'Customer Credit Limit Exceeded',
          message: `Customer ${cust.name} has exceeded their credit limit (Balance: Rs. ${(cust.balance / 100).toFixed(2)}, Limit: Rs. ${(cust.limit / 100).toFixed(2)}).`,
          route: '/customers',
          created_at: now,
          is_read: readIds.has(id),
          is_dismissed: dismissedIds.has(id),
        });
      }
    } catch {
      // Non-blocking
    }
  }

  // 3. Supplier Payables Alert
  const enableSupplierAlerts = (getSetting('notifications.enable_supplier_alerts' as any) as boolean ?? true);
  if (enableSupplierAlerts) {
    try {
      const suppliersWithPayables = db
        .select({
          count: sql<number>`count(*)`.mapWith(Number),
          total: sql<number>`coalesce(sum(${suppliers.current_balance_minor}), 0)`.mapWith(Number),
        })
        .from(suppliers)
        .where(and(eq(suppliers.is_active, true), gt(suppliers.current_balance_minor, 0)))
        .get();

      if (suppliersWithPayables && suppliersWithPayables.count > 0 && suppliersWithPayables.total > 1000000) {
        const id = 'supplier-payables-high';
        notifications.push({
          id,
          category: 'supplier_payable',
          severity: 'info',
          title: 'Pending Supplier Payables',
          message: `You have Rs. ${(suppliersWithPayables.total / 100).toFixed(2)} in pending balances across ${suppliersWithPayables.count.toString()} supplier(s).`,
          route: '/suppliers',
          created_at: now,
          is_read: readIds.has(id),
          is_dismissed: dismissedIds.has(id),
        });
      }
    } catch {
      // Non-blocking
    }
  }

  // 4. Cash Session Open Status
  const enableCashAlerts = (getSetting('notifications.enable_cash_alerts' as any) as boolean ?? true);
  if (enableCashAlerts) {
    try {
      const activeSession = db
        .select()
        .from(cashSessions)
        .where(eq(cashSessions.status, 'OPEN'))
        .orderBy(desc(cashSessions.opened_at))
        .get();

      if (!activeSession) {
        const id = 'cash-session-closed';
        notifications.push({
          id,
          category: 'cash_variance',
          severity: 'info',
          title: 'No Active Cash Session',
          message: 'There is currently no open cash register session. Open a session to process cash sales.',
          route: '/cash',
          created_at: now,
          is_read: readIds.has(id),
          is_dismissed: dismissedIds.has(id),
        });
      }
    } catch {
      // Non-blocking
    }
  }

  return notifications;
}

export function listNotifications(filter?: NotificationFilter): AppNotification[] {
  let list = generateSystemNotifications();

  // Filter by dismissed status
  if (filter?.dismissed === true) {
    list = list.filter((n) => n.is_dismissed === true);
  } else {
    // By default, only return non-dismissed (active) notifications
    list = list.filter((n) => !n.is_dismissed);
  }

  if (filter?.category) {
    list = list.filter((n) => n.category === filter.category);
  }
  if (filter?.severity) {
    list = list.filter((n) => n.severity === filter.severity);
  }
  if (filter?.is_read !== undefined) {
    list = list.filter((n) => n.is_read === filter.is_read);
  }
  if (filter?.limit && filter.limit > 0) {
    list = list.slice(0, filter.limit);
  }

  return list;
}

export function getUnreadNotificationCount(): number {
  const list = generateSystemNotifications();
  return list.filter((n) => !n.is_dismissed && !n.is_read).length;
}

export function markNotificationAsRead(id: string): void {
  const readIds = getReadNotificationIds();
  readIds.add(id);
  setSetting(READ_NOTIFICATIONS_KEY, Array.from(readIds));
}

export function markAllNotificationsAsRead(): void {
  const list = generateSystemNotifications();
  const readIds = getReadNotificationIds();
  for (const item of list) {
    readIds.add(item.id);
  }
  setSetting(READ_NOTIFICATIONS_KEY, Array.from(readIds));
}

export function dismissNotification(id: string): void {
  const dismissedIds = getDismissedNotificationIds();
  dismissedIds.add(id);
  setSetting(DISMISSED_NOTIFICATIONS_KEY, Array.from(dismissedIds));
}

export function undismissNotification(id: string): void {
  const dismissedIds = getDismissedNotificationIds();
  dismissedIds.delete(id);
  setSetting(DISMISSED_NOTIFICATIONS_KEY, Array.from(dismissedIds));
}
