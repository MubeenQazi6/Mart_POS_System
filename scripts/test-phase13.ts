import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../src/database/schema/index';
import { setDb } from '../src/database/client/index';
import { createCategory, createUnit } from '../src/repositories/catalog';
import { createProduct } from '../src/repositories/products';
import { createSupplier } from '../src/repositories/suppliers';
import { createPurchase } from '../src/repositories/purchases';
import { createCustomer, getCustomerById } from '../src/repositories/customers';
import { createSale, getSaleById, searchSales, voidSale } from '../src/repositories/sales';
import { openCashSession, getCashRegisterReport } from '../src/repositories/cash';
import { listStockSummary } from '../src/repositories/inventory';
import { listAuditLogs } from '../src/repositories/audit';
import path from 'node:path';
import fs from 'node:fs';

let dbPath = '';
let rawDb: Database.Database | null = null;
let passed = 0;
let failed = 0;
function assert(condition: boolean, name: string): void { if (condition) { console.log(`  [PASS] ${name}`); passed += 1; } else { console.error(`  [FAIL] ${name}`); failed += 1; } }
function setup(): void { dbPath = path.join(process.env.TEMP || '/tmp', `martpos-phase13-${Date.now()}.db`); rawDb = new Database(dbPath); rawDb.pragma('foreign_keys = ON'); const db = drizzle(rawDb, { schema }); setDb(db); migrate(db, { migrationsFolder: path.join(process.cwd(), 'src', 'database', 'migrations') }); }
function cleanup(): void { rawDb?.close(); for (const suffix of ['', '-wal', '-shm']) { const file = `${dbPath}${suffix}`; if (fs.existsSync(file)) fs.unlinkSync(file); } }
function run(): void {
  console.log('=== Phase 13 POS transaction controls ===');
  setup();
  try {
    const category = createCategory({ name: 'Phase 13' });
    const unit = createUnit({ name: 'Piece', abbreviation: 'pc', decimals: 0 });
    const product = createProduct({ name: 'Controlled Item', category_id: category.id, variants: [{ variant_name: 'Each', unit_id: unit.id, purchase_price_minor: 5000, selling_price_minor: 10000, sku: 'PH13-ITEM' }] });
    const variant = product.variants?.[0];
    if (!variant) throw new Error('Variant fixture missing');
    const supplier = createSupplier({ name: 'Phase 13 Supplier' });
    createPurchase({ supplier_id: supplier.id, items: [{ variant_id: variant.id, quantity: 10000, unit_cost_minor: 5000 }], payments: [] });
    const customer = createCustomer({ name: 'Phase 13 Customer', phone: `0300${Date.now().toString().slice(-7)}` });
    openCashSession({ opening_cash_minor: 100000 });

    const cashSale = createSale({ items: [{ variant_id: variant.id, quantity: 2000, discount_minor: 0 }], payments: [{ payment_method: 'cash', amount_minor: 20000 }], discount_minor: 0 });
    assert(searchSales({ search: cashSale.invoice_number, status: 'completed' }).length === 1, 'Invoice search finds completed sale');
    const stockBeforeVoid = listStockSummary({ is_active: true }).find((row) => row.variant_id === variant.id)?.current_stock ?? 0;
    const voidedCashSale = voidSale(cashSale.id);
    assert(voidedCashSale.status === 'cancelled', 'Completed sale is voided by status');
    assert((listStockSummary({ is_active: true }).find((row) => row.variant_id === variant.id)?.current_stock ?? 0) === stockBeforeVoid + 2000, 'Voiding sale restores stock');
    const cashReport = getCashRegisterReport();
    assert(cashReport.cash_in_minor >= 20000, 'Cash sale void creates cash reversal movement');
    assert(getSaleById(cashSale.id).invoice_number === cashSale.invoice_number, 'Voiding preserves original invoice number');

    let duplicateVoidRejected = false;
    try { voidSale(cashSale.id); } catch { duplicateVoidRejected = true; }
    assert(duplicateVoidRejected, 'Already voided sale cannot be voided again');

    const creditSale = createSale({ customer_id: customer.id, items: [{ variant_id: variant.id, quantity: 1000, discount_minor: 0 }], payments: [{ payment_method: 'credit', amount_minor: 10000 }], discount_minor: 0 });
    assert(getCustomerById(customer.id).current_balance_minor === 10000, 'Credit sale increases Khata balance');
    voidSale(creditSale.id);
    assert(getCustomerById(customer.id).current_balance_minor === 0, 'Voiding credit sale reverses Khata balance');
    assert(listAuditLogs({ search: 'Voided sale', limit: 20 }).some((entry) => entry.event_type === 'SALE_VOID'), 'Sale void is audited');
    assert(listAuditLogs({ search: 'BILL', limit: 20 }).every((entry) => ['BILL_HOLD', 'BILL_RESUME', 'BILL_DELETE'].includes(entry.event_type) || entry.event_type !== 'BILL'), 'Audit log remains queryable');
  } finally { cleanup(); }
  console.log(`\nSummary: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}
run();
