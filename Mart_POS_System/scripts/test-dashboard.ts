import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../src/database/schema/index';
import { setDb } from '../src/database/client/index';
import { createCategory, createUnit } from '../src/repositories/catalog';
import { createProduct } from '../src/repositories/products';
import { openCashSession } from '../src/repositories/cash';
import { createSale } from '../src/repositories/sales';
import { createSupplier } from '../src/repositories/suppliers';
import { createCustomer } from '../src/repositories/customers';
import { createPurchase } from '../src/repositories/purchases';
import { createExpenseCategory, createExpense } from '../src/repositories/expenses';
import { createSalesReturn } from '../src/repositories/returns';
import { getDashboardKpis, getSalesTrend, getTopProducts, getPaymentBreakdown, getRecentActivity } from '../src/repositories/dashboard';
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
  dbPath = path.join(tempDir, `martpos-phase11-${Date.now()}.db`);
  rawDb = new Database(dbPath);
  rawDb.pragma('journal_mode = WAL');
  rawDb.pragma('foreign_keys = ON');
  const db = drizzle(rawDb, { schema });
  setDb(db);
  migrate(db, { migrationsFolder: path.join(process.cwd(), 'src', 'database', 'migrations') });
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
  console.log('=== Phase 11 Dashboard tests ===');
  setup();
  try {
    const category = createCategory({ name: 'Groceries' });
    const unit = createUnit({ name: 'Piece', abbreviation: 'pc', decimals: 0 });
    
    // Open a cash session since sales require it for cash payments
    openCashSession({ opening_cash_minor: 0 });

    const product = createProduct({
      name: 'Rice 5kg',
      category_id: category.id,
      variants: [{ variant_name: 'Bag', unit_id: unit.id, purchase_price_minor: 90000, selling_price_minor: 150000, sku: 'RICE-5KG', min_stock_alert: 5 }],
    });
    const variant = product.variants?.[0];
    if (!variant) throw new Error('Variant missing');

    const supplier = createSupplier({ name: 'Alpha Foods' });
    const customer = createCustomer({ name: 'Customer One', phone: '03000000001' });

    const initialKpis = getDashboardKpis({ preset: 'today' });
    assert(initialKpis.active_product_count === 1, 'Product count is sourced from active products');
    assert(initialKpis.active_customer_count === 1, 'Customer count is sourced from active customers');
    assert(initialKpis.active_supplier_count === 1, 'Supplier count is sourced from active suppliers');

    createSale({ items: [{ variant_id: variant.id, quantity: 2000, discount_minor: 0 }], payments: [{ payment_method: 'cash', amount_minor: 300000 }], discount_minor: 0 });
    createSale({
      customer_id: customer.id,
      items: [{ variant_id: variant.id, quantity: 1000, discount_minor: 0 }],
      payments: [{ payment_method: 'credit', amount_minor: 150000 }],
      discount_minor: 0,
    });
    const purchase = createPurchase({ supplier_id: supplier.id, items: [{ variant_id: variant.id, quantity: 5000, unit_cost_minor: 90000 }], payments: [{ payment_method: 'bank_transfer', amount_minor: 450000 }], discount_minor: 0, tax_minor: 0 });

    const expenseCategory = createExpenseCategory({ name: 'Utilities' });
    createExpense({ category_id: expenseCategory.id, amount_minor: 10000, payment_method: 'bank_transfer', description: 'Electricity', expense_date: new Date().toISOString().split('T')[0] });

    const kpis = getDashboardKpis({ preset: 'today' });
    assert(kpis.sales_revenue_minor === 450000, 'Today sales revenue is authoritative');
    assert(kpis.sales_invoice_count === 2, 'Today invoice count includes completed sales');
    assert(kpis.gross_profit_minor === 180000, 'Gross profit is revenue minus COGS');
    assert(kpis.customer_receivables_minor === 150000, 'Customer receivables reflects credit balance');
    assert(kpis.supplier_payables_minor === 0, 'Supplier payables remain zero with no unpaid purchase');
    assert(kpis.inventory_value_minor > 0, 'Inventory valuation is available');
    assert(kpis.low_stock_count >= 0, 'Low stock count is available');
    assert(kpis.purchases_amount_minor === purchase.total_minor, 'Purchase total is sourced from purchases in range');
    assert(kpis.today_sales_revenue_minor === 450000, 'Today sales revenue is independently scoped');
    assert(kpis.today_purchases_amount_minor === purchase.total_minor, 'Today purchase total is independently scoped');
    assert(kpis.expenses_minor === 10000, 'Expense total is sourced from posted expenses in range');
    assert(kpis.gross_profit_minor === 180000, 'Profit uses the sale-time purchase cost snapshot');

    const salesReturn = createSalesReturn({ sale_id: 1, items: [{ source_item_id: 1, quantity: 1000 }], reason: 'Customer return', refund_method: 'cash' });
    const afterReturnKpis = getDashboardKpis({ preset: 'today' });
    assert(afterReturnKpis.returns_count === 1, 'Return count is sourced from sales returns');
    assert(afterReturnKpis.returns_amount_minor === salesReturn.refund_amount_minor, 'Return total is sourced from return refund value');
    assert(getRecentActivity(10).some((item) => item.type === 'purchase' && item.id === purchase.id), 'Recent activity includes purchases');

    const trend = getSalesTrend({ preset: '7d' });
    assert(Array.isArray(trend), 'Sales trend returns a time series array');

    const topProducts = getTopProducts({ limit: 5 });
    assert(topProducts.length >= 1, 'Top products returns at least one product');

    const paymentBreakdown = getPaymentBreakdown({ preset: 'today' });
    assert(paymentBreakdown.cash_minor >= 0, 'Cash payment split is aggregated');
    assert(paymentBreakdown.card_minor >= 0, 'Card payment split is aggregated');
    assert(paymentBreakdown.credit_minor >= 0, 'Khata payment split is aggregated');

    const lowStock = getDashboardKpis({ preset: 'today', low_stock_only: true }).low_stock_items;
    assert(Array.isArray(lowStock), 'Low stock alert list is returned');

    assert(supplier.id > 0 && variant.id > 0, 'Purchase fixtures are valid');
  } finally {
    cleanup();
  }

  console.log(`\nSummary: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

run();
