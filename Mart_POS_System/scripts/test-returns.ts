import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../src/database/schema/index';
import { setDb } from '../src/database/client/index';
import { createCategory, createUnit } from '../src/repositories/catalog';
import { createProduct } from '../src/repositories/products';
import { createSupplier, getSupplierById } from '../src/repositories/suppliers';
import { createPurchase } from '../src/repositories/purchases';
import { createCustomer, getCustomerById } from '../src/repositories/customers';
import { createSale } from '../src/repositories/sales';
import { openCashSession } from '../src/repositories/cash';
import { createSalesReturn, createPurchaseReturn, searchSales, searchPurchases } from '../src/repositories/returns';
import { listStockSummary } from '../src/repositories/inventory';
import { listAuditLogs } from '../src/repositories/audit';
import path from 'node:path';
import fs from 'node:fs';

let dbPath = '';
let rawDb: Database.Database | null = null;
let passed = 0;
let failed = 0;
function countRows(table: string): number {
  if (!rawDb) throw new Error('Test database is not initialized');
  const row = rawDb.prepare(`SELECT count(*) AS count FROM ${table}`).get() as { count: number };
  return row.count;
}
function assert(condition: boolean, name: string): void { if (condition) { console.log(`  [PASS] ${name}`); passed += 1; } else { console.error(`  [FAIL] ${name}`); failed += 1; } }
function setup(): void {
  dbPath = path.join(process.env.TEMP || '/tmp', `martpos-returns-${Date.now()}.db`);
  rawDb = new Database(dbPath);
  rawDb.pragma('foreign_keys = ON');
  const db = drizzle(rawDb, { schema });
  setDb(db);
  migrate(db, { migrationsFolder: path.join(process.cwd(), 'src', 'database', 'migrations') });
}
function cleanup(): void { rawDb?.close(); for (const suffix of ['', '-wal', '-shm']) { const file = `${dbPath}${suffix}`; if (fs.existsSync(file)) fs.unlinkSync(file); } }
function run(): void {
  console.log('=== Returns integration tests ===');
  setup();
  try {
    const category = createCategory({ name: 'Returns Test' });
    const unit = createUnit({ name: 'Piece', abbreviation: 'pc', decimals: 0 });
    const product = createProduct({ name: 'Return Item', category_id: category.id, variants: [{ variant_name: 'Each', unit_id: unit.id, purchase_price_minor: 5000, selling_price_minor: 10000, sku: 'RET-ITEM', min_stock_alert: 0 }] });
    const variant = product.variants?.[0];
    if (!variant) throw new Error('Variant fixture missing');
    const supplier = createSupplier({ name: 'Return Supplier' });
    const customer = createCustomer({ name: 'Return Customer', phone: `0300${Date.now().toString().slice(-7)}` });
    const purchase = createPurchase({ supplier_id: supplier.id, items: [{ variant_id: variant.id, quantity: 10000, unit_cost_minor: 5000 }], payments: [] });
    const sale = createSale({ customer_id: customer.id, items: [{ variant_id: variant.id, quantity: 4000, discount_minor: 0 }], payments: [{ payment_method: 'cash', amount_minor: 40000 }], discount_minor: 0 });
    openCashSession({ opening_cash_minor: 100000 });
    const saleSource = searchSales(sale.invoice_number)[0];
    const saleItem = saleSource?.items?.[0];
    assert(Boolean(saleSource && saleItem?.remaining_quantity === 4000), 'Sales search exposes returnable quantity');
    if (!saleItem) throw new Error('Sale item fixture missing');
    const partial = createSalesReturn({ sale_id: sale.id, items: [{ source_item_id: saleItem.source_item_id, quantity: 1000 }], reason: 'Customer changed mind', refund_method: 'cash' });
    assert(partial.return_number === 'RET-00001', 'Sales return number is sequential');
    const afterPartial = searchSales(sale.invoice_number)[0]?.items?.[0];
    assert(afterPartial?.remaining_quantity === 3000, 'Partial return reduces remaining quantity');
    const creditSale = createSale({ customer_id: customer.id, items: [{ variant_id: variant.id, quantity: 2000, discount_minor: 0 }], payments: [{ payment_method: 'credit', amount_minor: 20000 }], discount_minor: 0 });
    const creditItem = searchSales(creditSale.invoice_number)[0]?.items?.[0];
    if (!creditItem) throw new Error('Credit sale item fixture missing');
    const balanceBeforeCreditReturn = getCustomerById(customer.id).current_balance_minor;
    createSalesReturn({ sale_id: creditSale.id, items: [{ source_item_id: creditItem.source_item_id, quantity: 1000 }], reason: 'Credit return', refund_method: 'credit' });
    assert(getCustomerById(customer.id).current_balance_minor === balanceBeforeCreditReturn - 10000, 'Khata return reduces customer receivable');
    const full = createSalesReturn({ sale_id: sale.id, items: [{ source_item_id: saleItem.source_item_id, quantity: 3000 }], reason: 'Full return', refund_method: 'cash' });
    assert(full.refund_amount_minor === 30000, 'Full sales refund uses historical line price');
    let overRejected = false;
    const returnCountBeforeFailure = countRows('sales_returns');
    try { createSalesReturn({ sale_id: sale.id, items: [{ source_item_id: saleItem.source_item_id, quantity: 1 }], reason: 'Over return', refund_method: 'cash' }); } catch { overRejected = true; }
    assert(overRejected, 'Over-return is rejected');
    assert(countRows('sales_returns') === returnCountBeforeFailure, 'Failed sales return rolls back its return record');
    const stock = listStockSummary({ is_active: true }).find((row) => row.variant_id === variant.id);
    assert(stock?.current_stock === 9000, 'Resalable sales return restores stock');
    const purchaseSource = searchPurchases(purchase.purchase_number)[0];
    const purchaseItem = purchaseSource?.items?.[0];
    assert(Boolean(purchaseItem?.remaining_quantity === 10000), 'Purchase search exposes returnable quantity');
    if (!purchaseItem) throw new Error('Purchase item fixture missing');
    const purchaseReturn = createPurchaseReturn({ purchase_id: purchase.id, items: [{ source_item_id: purchaseItem.source_item_id, quantity: 2000 }], reason: 'Damaged shipment', refund_method: 'cash' });
    assert(purchaseReturn.return_number === 'PRET-00001', 'Purchase return number is sequential');
    assert(getSupplierById(supplier.id).current_balance_minor === 40000, 'Purchase return reduces supplier payable');
    const stockAfterPurchaseReturn = listStockSummary({ is_active: true }).find((row) => row.variant_id === variant.id);
    assert(stockAfterPurchaseReturn?.current_stock === 7000, 'Purchase return reduces stock');
    const purchaseReturnCountBeforeFailure = countRows('purchase_returns');
    let purchaseOverRejected = false;
    try { createPurchaseReturn({ purchase_id: purchase.id, items: [{ source_item_id: purchaseItem.source_item_id, quantity: 9000 }], reason: 'Over return', refund_method: 'cash' }); } catch { purchaseOverRejected = true; }
    assert(purchaseOverRejected, 'Supplier over-return is rejected');
    assert(countRows('purchase_returns') === purchaseReturnCountBeforeFailure, 'Failed supplier return rolls back its return record');
    const audit = listAuditLogs({ search: 'return', limit: 20 });
    assert(audit.some((entry) => entry.event_type === 'SALES_RETURN_CREATE'), 'Sales return is audited');
    assert(audit.some((entry) => entry.event_type === 'PURCHASE_RETURN_CREATE'), 'Purchase return is audited');
  } finally { cleanup(); }
  console.log(`\nSummary: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}
run();
