import { getDb } from '../database/client/index';
import { sales, saleItems, salePayments, products, productVariants, customers, suppliers, purchases, salesReturns, purchaseReturns } from '../database/schema/index';
import { eq, and, gte, lte, desc, sql, type AnyColumn } from 'drizzle-orm';
import { listStockSummary } from './inventory';
import { getExpenseTotalForRange } from './expenses';
import type {
  DashboardKpiInput,
  DashboardKpis,
  DashboardSalesTrendPoint,
  DashboardTopProduct,
  DashboardPaymentBreakdown,
  DashboardLowStockItem,
  DashboardActivityItem,
  DashboardQuery,
} from '@shared/types/dashboard';

function normalizeDateRange(input?: DashboardKpiInput | DashboardQuery): { date_from?: string; date_to?: string } {
  const preset = input?.preset ?? 'today';
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

  if (input?.date_from && input?.date_to) {
    return { date_from: input.date_from, date_to: input.date_to };
  }

  if (preset === 'today') return { date_from: today, date_to: today };
  if (preset === 'yesterday') {
    const d = new Date(now.getTime() - 86400000);
    return { date_from: d.toISOString().split('T')[0], date_to: d.toISOString().split('T')[0] };
  }
  if (preset === '7d') {
    const d = new Date(now.getTime() - 6 * 86400000);
    return { date_from: d.toISOString().split('T')[0], date_to: today };
  }
  if (preset === '30d') {
    const d = new Date(now.getTime() - 29 * 86400000);
    return { date_from: d.toISOString().split('T')[0], date_to: today };
  }
  if (preset === 'this_month') {
    return { date_from: monthStart, date_to: today };
  }
  return {};
}

function getExpenseTotalMinor(date_from?: string, date_to?: string): number {
  try {
    return getExpenseTotalForRange({ date_from, date_to });
  } catch {
    return 0;
  }
}

function dateToEndOfDay(date: string | undefined): string | undefined {
  return date ? `${date}T23:59:59.999Z` : undefined;
}

function getDateConditions(column: AnyColumn, date_from?: string, date_to?: string) {
  return date_from && date_to ? [gte(column, date_from), lte(column, dateToEndOfDay(date_to) as string)] : [];
}

function getSalesSummary(date_from?: string, date_to?: string): { revenue: number; count: number; grossProfit: number } {
  const db = getDb();
  const rows = db.select({ id: sales.id, total_minor: sales.total_minor }).from(sales).where(and(eq(sales.status, 'completed'), ...getDateConditions(sales.created_at, date_from, date_to))).all();
  let grossProfit = 0;
  for (const sale of rows) {
    const items = db.select({ quantity: saleItems.quantity, line_total_minor: saleItems.line_total_minor, unit_cost_minor: saleItems.unit_cost_minor }).from(saleItems).where(eq(saleItems.sale_id, sale.id)).all();
    for (const item of items) grossProfit += item.line_total_minor - Math.round((item.quantity * item.unit_cost_minor) / 1000);
  }
  return { revenue: rows.reduce((sum, sale) => sum + sale.total_minor, 0), count: rows.length, grossProfit };
}

function getPurchaseSummary(date_from?: string, date_to?: string): { total: number; count: number } {
  const row = getDb().select({ total: sql<number>`COALESCE(sum(${purchases.total_minor}), 0)`, count: sql<number>`count(*)` }).from(purchases).where(and(...getDateConditions(purchases.created_at, date_from, date_to))).get();
  return { total: Number(row?.total ?? 0), count: Number(row?.count ?? 0) };
}

export function getDashboardKpis(input: DashboardKpiInput = {}): DashboardKpis {
  const { date_from, date_to } = normalizeDateRange(input);
  const db = getDb();

  const salesSummary = getSalesSummary(date_from, date_to);
  const today = new Date().toISOString().split('T')[0];
  const todaySalesSummary = getSalesSummary(today, today);
  const purchaseSummary = getPurchaseSummary(date_from, date_to);
  const todayPurchaseSummary = getPurchaseSummary(today, today);
  const expenseMinor = getExpenseTotalMinor(date_from, date_to);
  const stockSummary = listStockSummary({ is_active: true });
  const inventoryValueMinor = stockSummary.reduce((sum, item) => sum + Math.round((item.current_stock * item.purchase_price_minor) / 1000), 0);
  const lowStockItems = stockSummary.filter((item) => item.stock_status === 'low_stock' || item.stock_status === 'out_of_stock');
  const visibleLowStockItems = input.low_stock_only ? lowStockItems.filter((item) => item.stock_status === 'low_stock') : lowStockItems;
  const customerReceivables = db
    .select({ current_balance_minor: customers.current_balance_minor })
    .from(customers)
    .where(eq(customers.is_active, true))
    .all()
    .reduce((sum, row) => sum + Math.max(0, row.current_balance_minor), 0);

  const supplierPayables = db
    .select({ current_balance_minor: suppliers.current_balance_minor })
    .from(suppliers)
    .where(eq(suppliers.is_active, true))
    .all()
    .reduce((sum, row) => sum + Math.max(0, row.current_balance_minor), 0);
  const salesReturnSummary = db.select({ amount: sql<number>`COALESCE(sum(${salesReturns.refund_amount_minor}), 0)`, count: sql<number>`count(*)` }).from(salesReturns).where(and(...getDateConditions(salesReturns.created_at, date_from, date_to))).get();
  const purchaseReturnSummary = db.select({ amount: sql<number>`COALESCE(sum(${purchaseReturns.refund_amount_minor}), 0)`, count: sql<number>`count(*)` }).from(purchaseReturns).where(and(...getDateConditions(purchaseReturns.created_at, date_from, date_to))).get();

  return {
    sales_revenue_minor: salesSummary.revenue,
    sales_invoice_count: salesSummary.count,
    today_sales_revenue_minor: todaySalesSummary.revenue,
    today_sales_invoice_count: todaySalesSummary.count,
    purchases_amount_minor: purchaseSummary.total,
    purchases_invoice_count: purchaseSummary.count,
    today_purchases_amount_minor: todayPurchaseSummary.total,
    today_purchases_invoice_count: todayPurchaseSummary.count,
    gross_profit_minor: salesSummary.grossProfit,
    expenses_minor: expenseMinor,
    net_profit_minor: salesSummary.grossProfit - expenseMinor,
    customer_receivables_minor: customerReceivables,
    supplier_payables_minor: supplierPayables,
    inventory_value_minor: inventoryValueMinor,
    active_product_count: db.select().from(products).where(eq(products.is_active, true)).all().length,
    active_customer_count: db.select().from(customers).where(eq(customers.is_active, true)).all().length,
    active_supplier_count: db.select().from(suppliers).where(eq(suppliers.is_active, true)).all().length,
    low_stock_count: lowStockItems.filter((item) => item.stock_status === 'low_stock').length,
    out_of_stock_count: lowStockItems.filter((item) => item.stock_status === 'out_of_stock').length,
    low_stock_items: visibleLowStockItems.map((item) => ({
      product_name: item.product_name,
      variant_name: item.variant_name,
      sku: item.sku,
      current_stock: item.current_stock,
      min_stock_alert: item.min_stock_alert,
      status: item.stock_status === 'out_of_stock' ? 'out_of_stock' : 'low_stock',
    })),
    returns_amount_minor: Number(salesReturnSummary?.amount ?? 0) + Number(purchaseReturnSummary?.amount ?? 0),
    returns_count: Number(salesReturnSummary?.count ?? 0) + Number(purchaseReturnSummary?.count ?? 0),
  };
}

export function getSalesTrend(input: DashboardQuery = {}): DashboardSalesTrendPoint[] {
  const { date_from, date_to } = normalizeDateRange(input);
  const db = getDb();
  const rows = db
    .select({
      day: sql<string>`date(${sales.created_at})`,
      total: sql<number>`COALESCE(sum(${sales.total_minor}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(sales)
    .where(and(eq(sales.status, 'completed'), ...(date_from && date_to ? [gte(sales.created_at, date_from), lte(sales.created_at, dateToEndOfDay(date_to) as string)] : [])))
    .groupBy(sql`date(${sales.created_at})`)
    .orderBy(sql`date(${sales.created_at})`)
    .all();

  return rows.map((row) => ({
    date: String(row.day),
    sales_revenue_minor: Number(row.total),
    invoice_count: Number(row.count),
    gross_profit_minor: getSalesSummary(String(row.day), String(row.day)).grossProfit,
  }));
}

export function getTopProducts(input: DashboardQuery = {}): DashboardTopProduct[] {
  const { date_from, date_to } = normalizeDateRange(input);
  const db = getDb();
  const rows = db
    .select({
      product_name: products.name,
      variant_name: productVariants.variant_name,
      quantity_sold: sql<number>`sum(${saleItems.quantity})`,
      revenue_minor: sql<number>`sum(${saleItems.line_total_minor})`,
      gross_profit_minor: sql<number>`sum(${saleItems.line_total_minor} - round(${saleItems.quantity} * ${saleItems.unit_cost_minor} / 1000))`,
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.sale_id, sales.id))
    .innerJoin(productVariants, eq(saleItems.variant_id, productVariants.id))
    .innerJoin(products, eq(productVariants.product_id, products.id))
    .where(and(eq(sales.status, 'completed'), ...(date_from && date_to ? [gte(sales.created_at, date_from), lte(sales.created_at, dateToEndOfDay(date_to) as string)] : [])))
    .groupBy(products.name, productVariants.variant_name)
    .orderBy(desc(sql`sum(${saleItems.line_total_minor})`))
    .limit(input.limit && input.limit > 0 ? input.limit : 5)
    .all();

  return rows.map((row) => ({
    product_name: String(row.product_name),
    variant_name: String(row.variant_name),
    quantity_sold: Number(row.quantity_sold),
    revenue_minor: Number(row.revenue_minor),
    gross_profit_minor: Number(row.gross_profit_minor),
  }));
}

export function getPaymentBreakdown(input: DashboardQuery = {}): DashboardPaymentBreakdown {
  const { date_from, date_to } = normalizeDateRange(input);
  const db = getDb();
  const payments = db
    .select({ payment_method: salePayments.payment_method, amount_minor: salePayments.amount_minor })
    .from(salePayments)
    .innerJoin(sales, eq(salePayments.sale_id, sales.id))
    .where(and(eq(sales.status, 'completed'), ...(date_from && date_to ? [gte(sales.created_at, date_from), lte(sales.created_at, dateToEndOfDay(date_to) as string)] : [])))
    .all();

  const breakdown: DashboardPaymentBreakdown = { cash_minor: 0, card_minor: 0, credit_minor: 0, split_minor: 0 };
  for (const payment of payments) {
    if (payment.payment_method === 'cash') breakdown.cash_minor += Number(payment.amount_minor);
    else if (payment.payment_method === 'card') breakdown.card_minor += Number(payment.amount_minor);
    else if (payment.payment_method === 'credit') breakdown.credit_minor += Number(payment.amount_minor);
  }
  breakdown.split_minor = breakdown.cash_minor + breakdown.card_minor + breakdown.credit_minor;
  return breakdown;
}

export function getLowStockAlert(): DashboardLowStockItem[] {
  return listStockSummary({ low_stock_only: true, is_active: true }).map((item) => ({
    product_name: item.product_name,
    variant_name: item.variant_name,
    sku: item.sku,
    current_stock: item.current_stock,
    min_stock_alert: item.min_stock_alert,
    status: item.stock_status === 'out_of_stock' ? 'out_of_stock' : 'low_stock',
  }));
}

export function getRecentActivity(limit = 10): DashboardActivityItem[] {
  const db = getDb();
  const items: DashboardActivityItem[] = [];

  const recentSales = db
    .select({ id: sales.id, total_minor: sales.total_minor, created_at: sales.created_at })
    .from(sales)
    .where(eq(sales.status, 'completed'))
    .orderBy(desc(sales.created_at), desc(sales.id))
    .limit(limit)
    .all();

  for (const row of recentSales) {
    items.push({ id: row.id, type: 'sale', label: `Sale #${row.id}`, amount_minor: row.total_minor, created_at: row.created_at });
  }

  const recentPurchases = db
    .select({ id: purchases.id, total_minor: purchases.total_minor, created_at: purchases.created_at })
    .from(purchases)
    .orderBy(desc(purchases.created_at), desc(purchases.id))
    .limit(limit)
    .all();

  for (const row of recentPurchases) {
    items.push({ id: row.id, type: 'purchase', label: `Purchase #${row.id}`, amount_minor: row.total_minor, created_at: row.created_at });
  }

  return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, limit);
}
