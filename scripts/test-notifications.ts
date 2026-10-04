import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../src/database/schema/index';
import { setDb } from '../src/database/client/index';
import { createCategory, createUnit } from '../src/repositories/catalog';
import { createProduct } from '../src/repositories/products';
import { createCustomer } from '../src/repositories/customers';
import { createMovement } from '../src/repositories/inventory';
import {
  generateSystemNotifications,
  listNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  dismissNotification,
} from '../src/repositories/notifications';
import { setActiveSession, ensureDefaultAdmin } from '../src/repositories/auth';
import path from 'node:path';
import fs from 'node:fs';

let dbPath: string | null = null;
let rawDb: Database.Database | null = null;
let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: string): void {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${String(testName)}${details ? ` — ${String(details)}` : ''}`);
    failed++;
  }
}

function setup(): void {
  const tempDir = path.join(process.env.TEMP || process.env.TMP || '/tmp');
  dbPath = path.join(tempDir, `martpos-test-notif-${Date.now()}.db`);
  rawDb = new Database(dbPath);
  rawDb.pragma('journal_mode = WAL');
  rawDb.pragma('foreign_keys = ON');
  const db = drizzle(rawDb, { schema });
  setDb(db);
  migrate(db, { migrationsFolder: path.join(process.cwd(), 'src', 'database', 'migrations') });

  ensureDefaultAdmin();
  setActiveSession({ id: 1, username: 'admin', full_name: 'Administrator', role: 'admin', is_active: true, created_at: '', updated_at: '' }, 'test-token');
}

function cleanup(): void {
  if (rawDb) rawDb.close();
  if (dbPath && fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  const wal = `${dbPath}-wal`;
  const shm = `${dbPath}-shm`;
  if (wal && fs.existsSync(wal)) fs.unlinkSync(wal);
  if (shm && fs.existsSync(shm)) fs.unlinkSync(shm);
}

function run(): void {
  console.log('=== Notifications Module Automated Tests ===');
  setup();

  try {
    // 1. Initial State: No active cash session generates a notification
    let initialNotifs = listNotifications();
    const cashNotif = initialNotifs.find((n) => n.category === 'cash_variance');
    assert(cashNotif !== undefined, 'Generated notification for missing cash session');
    assert(cashNotif?.severity === 'info', 'Cash session notification has severity info');

    // 2. Setup product with out-of-stock and low-stock condition
    const cat = createCategory({ name: 'Groceries' });
    const unit = createUnit({ name: 'Piece', abbreviation: 'pc', decimals: 0 });

    const prod = createProduct({
      name: 'Wheat Flour 10kg',
      category_id: cat.id,
      variants: [
        {
          variant_name: 'Regular',
          unit_id: unit.id,
          purchase_price_minor: 80000,
          selling_price_minor: 110000,
          min_stock_alert: 5000, // 5 units min alert
        },
      ],
    });

    const vId = prod.variants![0]!.id;

    // Stock is 0 -> Should generate Out of Stock alert
    let notifs = generateSystemNotifications();
    const outOfStockNotif = notifs.find((n) => n.category === 'out_of_stock');
    assert(outOfStockNotif !== undefined, 'Out of Stock alert generated for zero-stock variant');
    assert(outOfStockNotif?.severity === 'error', 'Out of stock has error severity');

    // Add 2 units of stock (2000 scaled) -> Below min_stock_alert (5000) -> Should generate Low Stock alert
    createMovement({
      variant_id: vId,
      direction: 'in',
      quantity: 2000,
      adjustment_type: 'manual_adjustment',
      notes: 'Initial partial stock',
    });

    notifs = generateSystemNotifications();
    const lowStockNotif = notifs.find((n) => n.category === 'low_stock');
    assert(lowStockNotif !== undefined, 'Low Stock alert generated when stock < min_stock_alert');
    assert(lowStockNotif?.severity === 'warning', 'Low stock alert has warning severity');

    // 3. Customer credit limit exceeded condition
    createCustomer({
      name: 'Credit Test Customer',
      phone: '+92 300 9999999',
      credit_limit_minor: 50000, // 500 Rs limit
      opening_balance_minor: 100000, // 1000 Rs debt (exceeds limit!)
    });

    notifs = generateSystemNotifications();
    const creditNotif = notifs.find((n) => n.category === 'customer_credit');
    assert(creditNotif !== undefined, 'Customer credit limit exceeded notification generated');

    // 4. Mark as Read functionality
    const unreadBefore = getUnreadNotificationCount();
    assert(unreadBefore > 0, `Unread notification count before reading is ${unreadBefore}`);

    if (creditNotif) {
      markNotificationAsRead(creditNotif.id);
      const unreadAfter = getUnreadNotificationCount();
      assert(unreadAfter === unreadBefore - 1, 'Marking notification as read decrements unread count');
    }

    // 5. Mark all as read
    markAllNotificationsAsRead();
    assert(getUnreadNotificationCount() === 0, 'markAllNotificationsAsRead clears all unread indicators');

    // 6. Dismiss notification
    if (lowStockNotif) {
      dismissNotification(lowStockNotif.id);
      const afterDismiss = listNotifications();
      const dismissedFound = afterDismiss.find((n) => n.id === lowStockNotif.id);
      assert(dismissedFound === undefined, 'Dismissed notification is no longer returned in list');
    }

  } finally {
    cleanup();
  }

  console.log(`\nSummary: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

run();
