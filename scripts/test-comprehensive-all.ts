/**
 * MARTPOS — Comprehensive Master Test Suite
 * Covers: Money, Invoices, Auth, Catalog, Products, Barcodes,
 * Inventory, Suppliers, Customers, POS (Cash/Credit/Manual/Mixed),
 * Held Bills, Void, Search, Settings, DB Integrity
 */

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../src/database/schema/index';
import { setDb } from '../src/database/client/index';
import { join } from 'path';
import { tmpdir } from 'os';
import { existsSync, unlinkSync } from 'fs';

import { ensureDefaultAdmin, login, logout, getActiveUser, changePassword } from '../src/repositories/auth';
import { createCategory, createBrand, createUnit, listCategories, listBrands, listUnits } from '../src/repositories/catalog';
import { createProduct, addBarcode, listProducts } from '../src/repositories/products';
import { createMovement, getVariantStock, listMovements } from '../src/repositories/inventory';
import {
  createSale, lookupByBarcode, holdBill, getHeldBills,
  resumeHeldBill, deleteHeldBill, voidSale, searchSales, getSaleById,
} from '../src/repositories/sales';
import { createPurchase } from '../src/repositories/purchases';
import { createSupplier, recordSupplierPayment, getSupplierById } from '../src/repositories/suppliers';
import { createCustomer, getCustomerById, recordCustomerPayment, listCustomers } from '../src/repositories/customers';
import { generateInvoiceNumber, calculateCartTotals, formatInvoiceTimestamp, isValidInvoiceNumber } from '../src/domain/sales';
import { toMinorUnits, fromMinorUnits, formatMoney } from '../src/shared/utils/money';
import { getAllSettings, setManySettings } from '../src/repositories/settings';

const stockOf = (id: number): number => getVariantStock(id).current_stock;

// ─── Framework ───────────────────────────────────────────────
let passed = 0;
let failed = 0;
let skipped = 0;
const failures: string[] = [];

function assert(cond: boolean, name: string, detail?: string): void {
  if (cond) { console.log(`  \u2705 ${name}`); passed++; }
  else {
    const msg = `  \u274c ${name}${detail ? ` \u2192 ${detail}` : ''}`;
    console.error(msg);
    failures.push(name + (detail ? `: ${detail}` : ''));
    failed++;
  }
}
function section(t: string): void {
  console.log(`\n${'='.repeat(62)}\n  ${t}\n${'='.repeat(62)}`);
}
function skip(name: string, reason: string): void {
  console.log(`  \u26a0\ufe0f  SKIP: ${name} (${reason})`);
  skipped++;
}

// ─── DB Setup ────────────────────────────────────────────────
const testDbPath = join(tmpdir(), `martpos-comprehensive-${Date.now()}.db`);
const sqlite = new Database(testDbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');
const db = drizzle(sqlite, { schema });
setDb(db);
migrate(db, { migrationsFolder: join(process.cwd(), 'src', 'database', 'migrations') });

try {

// ════════════════════════════════════════════════════════════
section('1. Money Utilities & Financial Precision');
// ════════════════════════════════════════════════════════════

assert(toMinorUnits(100) === 10000, 'toMinorUnits(100) = 10000');
assert(toMinorUnits(1.5) === 150, 'toMinorUnits(1.5) = 150');
assert(toMinorUnits(0.005) === 1, 'toMinorUnits(0.005) rounds to 1');
assert(fromMinorUnits(10000) === 100, 'fromMinorUnits(10000) = 100');
assert(fromMinorUnits(150) === 1.5, 'fromMinorUnits(150) = 1.5');
assert(typeof formatMoney(10000) === 'string', 'formatMoney returns string');
assert(formatMoney(10000).includes('100'), 'formatMoney(10000) contains 100');

const cart = calculateCartTotals(
  [{ variant_id: 1, quantity: 3000, unit_price_minor: 15000, discount_minor: 0 },
   { variant_id: 2, quantity: 2000, unit_price_minor: 8000, discount_minor: 500 }],
  1000,
);
assert(cart.subtotal_minor === 61000, `Cart subtotal: expected 61000 got ${cart.subtotal_minor}`);
assert(cart.discount_minor === 1500, `Cart discount: expected 1500 got ${cart.discount_minor}`);
assert(cart.total_minor === 59500, `Cart total: expected 59500 got ${cart.total_minor}`);
assert(cart.item_totals.length === 2, 'Cart has 2 item_totals');

const single = calculateCartTotals([{ variant_id: 1, quantity: 1000, unit_price_minor: 5000, discount_minor: 0 }], 0);
assert(single.total_minor === 5000, 'Single item 1u @ 5000 = 5000');

try { calculateCartTotals([{ variant_id: 1, quantity: 1000, unit_price_minor: 5000, discount_minor: 0 }], 9000); assert(false, 'Over-discount should throw'); }
catch { assert(true, 'Bill discount > total rejected \u2713'); }

try { calculateCartTotals([{ variant_id: 1, quantity: 1000, unit_price_minor: 5000, discount_minor: 0 }], -100); assert(false, 'Negative bill discount should throw'); }
catch { assert(true, 'Negative bill discount rejected \u2713'); }

try { calculateCartTotals([{ variant_id: 1, quantity: 1000, unit_price_minor: 5000, discount_minor: 9999 }], 0); assert(false, 'Item discount > line total should throw'); }
catch { assert(true, 'Item discount > line total rejected \u2713'); }

// ════════════════════════════════════════════════════════════
section('2. Invoice Number Generation & Validation');
// ════════════════════════════════════════════════════════════

const inv1 = generateInvoiceNumber(1);
const inv100 = generateInvoiceNumber(100);
assert(inv1.startsWith('INV-'), 'Invoice starts with INV-');
assert(inv1.endsWith('-00001'), `Invoice 1 ends -00001 (got ${inv1})`);
assert(inv100.endsWith('-00100'), `Invoice 100 ends -00100 (got ${inv100})`);
assert(isValidInvoiceNumber(inv1), 'Generated invoice passes isValidInvoiceNumber');
assert(isValidInvoiceNumber('INV-20260101120000-00001'), 'Timestamp format is valid');
assert(!isValidInvoiceNumber('INVALID'), 'INVALID string fails');
assert(!isValidInvoiceNumber(''), 'Empty string fails');
const ts = formatInvoiceTimestamp(new Date('2026-01-15T14:30:45'));
assert(ts === '20260115143045', `formatInvoiceTimestamp: expected 20260115143045 got ${ts}`);
try { generateInvoiceNumber(0); assert(false, 'seq=0 should throw'); } catch { assert(true, 'seq=0 throws \u2713'); }
try { generateInvoiceNumber(-1); assert(false, 'seq=-1 should throw'); } catch { assert(true, 'seq=-1 throws \u2713'); }

// ════════════════════════════════════════════════════════════
section('3. Authentication & Authorization');
// ════════════════════════════════════════════════════════════

ensureDefaultAdmin();
const loginOk = login({ username: 'admin', password: 'admin123' });
assert(loginOk !== null, 'login() correct creds succeeds');
assert(loginOk?.username === 'admin', 'Logged-in user is admin');
assert(loginOk?.role === 'admin', 'Default admin has admin role');

const active = getActiveUser();
assert(active !== null, 'getActiveUser after login returns user');

try { login({ username: 'admin', password: 'wrongpassword' }); assert(false, 'Wrong password should throw'); }
catch { assert(true, 'Wrong password throws ✓'); }

try { login({ username: 'ghost', password: 'anything' }); assert(false, 'Non-existent user should throw'); }
catch { assert(true, 'Non-existent user throws ✓'); }

changePassword({ currentPassword: 'admin123', newPassword: 'newpass456' });
logout();
assert(getActiveUser() === null, 'getActiveUser null after logout');
const newLogin = login({ username: 'admin', password: 'newpass456' });
assert(newLogin !== null, 'Login with new password works');
changePassword({ currentPassword: 'newpass456', newPassword: 'admin123' }); // restore
assert(login({ username: 'admin', password: 'admin123' }) !== null, 'Restored password login works');

// ════════════════════════════════════════════════════════════
section('4. Catalog — Categories, Brands, Units');
// ════════════════════════════════════════════════════════════

const catBev = createCategory({ name: 'Beverages', description: 'All drinks' });
const catSnacks = createCategory({ name: 'Snacks' });
const catDairy = createCategory({ name: 'Dairy' });
assert(catBev.id > 0, 'Category Beverages created');
assert(catSnacks.id > 0, 'Category Snacks created');
assert(catDairy.id > 0, 'Category Dairy created');

const brand1 = createBrand({ name: 'Supreme Foods' });
const brand2 = createBrand({ name: 'Fresh Valley' });
assert(brand1.id > 0, 'Brand Supreme Foods created');
assert(brand2.id > 0, 'Brand Fresh Valley created');

const unitPc = createUnit({ name: 'Piece', abbreviation: 'pc', decimals: 0 });
const unitKg = createUnit({ name: 'Kilogram', abbreviation: 'kg', decimals: 3 });
const unitL = createUnit({ name: 'Litre', abbreviation: 'L', decimals: 1 });
assert(unitPc.id > 0, 'Unit Piece created');
assert(unitKg.id > 0, 'Unit Kg created');
assert(unitL.id > 0, 'Unit Litre created');

assert(listCategories().length >= 3, 'listCategories >= 3');
assert(listBrands().length >= 2, 'listBrands >= 2');
assert(listUnits().length >= 3, 'listUnits >= 3');

// ════════════════════════════════════════════════════════════
section('5. Products & Variants');
// ════════════════════════════════════════════════════════════

const prodRice = createProduct({
  name: 'Premium Basmati Rice',
  category_id: catBev.id,
  brand_id: brand1.id,
  variants: [
    { variant_name: '5 KG Bag', sku: 'RICE-5KG', unit_id: unitKg.id, purchase_price_minor: 100000, selling_price_minor: 150000, min_stock_alert: 5000,
      barcodes: [{ barcode: '8961234567890', barcode_type: 'EAN13', is_primary: true }] },
    { variant_name: '10 KG Bag', sku: 'RICE-10KG', unit_id: unitKg.id, purchase_price_minor: 190000, selling_price_minor: 280000, min_stock_alert: 3000 },
  ],
});
assert(prodRice.id > 0, 'Product Rice created');
assert(prodRice.variants?.length === 2, 'Rice has 2 variants');
const var5kg = prodRice.variants![0]!;
const var10kg = prodRice.variants![1]!;
assert(var5kg.selling_price_minor === 150000, `5KG price: 150000 (got ${var5kg.selling_price_minor})`);
assert(var10kg.selling_price_minor === 280000, `10KG price: 280000 (got ${var10kg.selling_price_minor})`);

const prodJuice = createProduct({
  name: 'Mango Juice 1L', category_id: catBev.id,
  variants: [{ variant_name: 'Regular', sku: 'JUICE-MANGO-1L', unit_id: unitL.id,
    purchase_price_minor: 8000, selling_price_minor: 12000, min_stock_alert: 10000,
    barcodes: [{ barcode: '8900000001234', barcode_type: 'EAN13', is_primary: true }] }],
});
const varJuice = prodJuice.variants![0]!;

const prodChips = createProduct({
  name: 'Potato Chips 50g', category_id: catSnacks.id,
  variants: [{ variant_name: 'Classic Salt', sku: 'CHIPS-CLASS-50G', unit_id: unitPc.id,
    purchase_price_minor: 3000, selling_price_minor: 5000, min_stock_alert: 5000,
    barcodes: [{ barcode: '8900000009999', barcode_type: 'EAN13', is_primary: true }] }],
});
const varChips = prodChips.variants![0]!;

const extraBC = addBarcode({ variant_id: var5kg.id, barcode: 'RICE5KG-ALT', barcode_type: 'CODE128', is_primary: false });
assert(extraBC.barcode === 'RICE5KG-ALT', 'Extra barcode added');

assert(listProducts({ is_active: true }).length >= 3, 'listProducts >= 3');
const sr = listProducts({ search: 'Basmati', is_active: true });
assert(sr.length >= 1 && (sr[0]?.name.includes('Basmati') ?? false), 'listProducts finds Basmati');

// ════════════════════════════════════════════════════════════
section('6. Barcode Lookup (POS Scan)');
// ════════════════════════════════════════════════════════════

const bc1 = lookupByBarcode('8961234567890');
assert(bc1 !== null, 'Barcode 8961234567890 found');
assert(bc1?.variant_id === var5kg.id, 'Correct variant_id from barcode');
assert(bc1?.selling_price_minor === 150000, 'Correct price from barcode lookup');
assert(lookupByBarcode('0000000000000') === null, 'Unknown barcode returns null');
const altBc = lookupByBarcode('RICE5KG-ALT');
assert(altBc?.variant_id === var5kg.id, 'Alt barcode resolves same variant');
assert(lookupByBarcode('8900000001234')?.variant_id === varJuice.id, 'Juice barcode correct');

// ════════════════════════════════════════════════════════════
section('7. Inventory Management & Stock Movements');
// ════════════════════════════════════════════════════════════

assert(stockOf(var5kg.id) === 0, 'Rice 5KG initial stock = 0');

createMovement({ variant_id: var5kg.id, adjustment_type: 'opening_stock', quantity: 50000 });
assert(stockOf(var5kg.id) === 50000, 'Stock after IN: 50000');

createMovement({ variant_id: var10kg.id, adjustment_type: 'opening_stock', quantity: 30000 });
createMovement({ variant_id: varJuice.id, adjustment_type: 'opening_stock', quantity: 100000 });
createMovement({ variant_id: varChips.id, adjustment_type: 'opening_stock', quantity: 3000 });

createMovement({ variant_id: var5kg.id, adjustment_type: 'damage', quantity: 2000, notes: 'Damaged bags' });
assert(stockOf(var5kg.id) === 48000, `Stock after damage: 48000 (got ${stockOf(var5kg.id)})`);

const hist = listMovements({ variant_id: var5kg.id });
assert(hist.length >= 2, `Movement history >= 2 records (got ${hist.length})`);

// ════════════════════════════════════════════════════════════
section('8. Suppliers & Purchase Orders');
// ════════════════════════════════════════════════════════════

const sup1 = createSupplier({ name: 'Al-Rehman Traders', phone: '0300-1234567', address: 'Lahore, PK' });
assert(sup1.id > 0, 'Supplier created');

const po = createPurchase({
  supplier_id: sup1.id,
  items: [
    { variant_id: var5kg.id, quantity: 10000, unit_cost_minor: 100000 },
    { variant_id: var10kg.id, quantity: 5000, unit_cost_minor: 190000 },
  ],
  payments: [{ payment_method: 'cash', amount_minor: 500000 }],
  notes: 'Test PO',
});
assert(po.id > 0, 'Purchase created');
assert(stockOf(var5kg.id) === 58000, `5KG stock after PO: 58000 (got ${stockOf(var5kg.id)})`);
assert(stockOf(var10kg.id) === 35000, `10KG stock after PO: 35000 (got ${stockOf(var10kg.id)})`);

// Total cost = 10*100000 + 5*190000 = 1950000, paid 500000 → balance 1450000
const supAfterPO = getSupplierById(sup1.id);
assert(supAfterPO!.current_balance_minor === 1450000, `Supplier balance after PO: expected 1450000 got ${supAfterPO!.current_balance_minor}`);

recordSupplierPayment({ supplier_id: sup1.id, amount_minor: 300000, payment_method: 'cash', notes: '2nd installment' });
assert(getSupplierById(sup1.id)!.current_balance_minor === 1150000, `Supplier balance after 2nd payment: expected 1150000`);

// ════════════════════════════════════════════════════════════
section('9. Customers & Khata Management');
// ════════════════════════════════════════════════════════════

const cust1 = createCustomer({ name: 'Haji Abdul Rasheed', phone: '0321-9876543', credit_limit_minor: 1500000 });
assert(cust1.id > 0, 'Customer 1 created');
assert(cust1.credit_limit_minor === 1500000, 'Credit limit stored correctly');
assert(cust1.current_balance_minor === 0, 'Initial balance = 0');

const cust2 = createCustomer({ name: 'Mrs. Fatima Bibi', phone: '0333-1234567', credit_limit_minor: 500000 });
assert(cust2.id > 0, 'Customer 2 created');
assert(listCustomers().length >= 2, 'listCustomers >= 2');

// ════════════════════════════════════════════════════════════
section('10. POS — Cash Sale');
// ════════════════════════════════════════════════════════════

const stockBefore10 = stockOf(var5kg.id);
const cashSale = createSale({
  items: [{ variant_id: var5kg.id, quantity: 3000, discount_minor: 0, is_manual: false }],
  payments: [{ payment_method: 'cash', amount_minor: 450000 }],
  discount_minor: 0,
  notes: 'Cash sale test',
});
assert(cashSale.id > 0, 'Cash sale created');
assert(cashSale.total_minor === 450000, `Cash sale total 450000 (got ${cashSale.total_minor})`);
assert(cashSale.status === 'completed', 'Sale status = completed');
assert(cashSale.invoice_number.startsWith('INV-'), 'Invoice starts with INV-');
assert(isValidInvoiceNumber(cashSale.invoice_number), 'Invoice number valid');
assert(stockOf(var5kg.id) === stockBefore10 - 3000, 'Stock decremented by 3 after cash sale');
const det = getSaleById(cashSale.id);
assert(det.items?.length === 1, 'Sale has 1 item');
assert(det.payments?.[0]?.payment_method === 'cash', 'Payment method is cash');

// ════════════════════════════════════════════════════════════
section('11. POS — Multi-Item Sale with Bill Discount');
// ════════════════════════════════════════════════════════════

// Rice 5KG 2u(300000) + Juice 3u(36000) = 336000, bill disc 5000 → 331000
const juiceBefore11 = stockOf(varJuice.id);
const multiSale = createSale({
  items: [
    { variant_id: var5kg.id, quantity: 2000, discount_minor: 0, is_manual: false },
    { variant_id: varJuice.id, quantity: 3000, discount_minor: 0, is_manual: false },
  ],
  payments: [{ payment_method: 'cash', amount_minor: 331000 }],
  discount_minor: 5000,
  notes: 'Multi-item discount',
});
assert(multiSale.id > 0, 'Multi-item sale created');
assert(multiSale.subtotal_minor === 336000, `Subtotal 336000 (got ${multiSale.subtotal_minor})`);
assert(multiSale.discount_minor === 5000, `Discount 5000 (got ${multiSale.discount_minor})`);
assert(multiSale.total_minor === 331000, `Total 331000 (got ${multiSale.total_minor})`);
assert(stockOf(varJuice.id) === juiceBefore11 - 3000, 'Juice stock decremented by 3');

const seq1 = parseInt(cashSale.invoice_number.match(/(\d+)$/)![1]!);
const seq2 = parseInt(multiSale.invoice_number.match(/(\d+)$/)![1]!);
assert(seq2 === seq1 + 1, `Invoice sequence increments (diff=${seq2 - seq1})`);

// ════════════════════════════════════════════════════════════
section('12. POS — Credit (Khata) Sale');
// ════════════════════════════════════════════════════════════

const creditSale = createSale({
  items: [{ variant_id: var5kg.id, quantity: 3000, discount_minor: 0, is_manual: false }],
  payments: [{ payment_method: 'credit', amount_minor: 450000 }],
  discount_minor: 0,
  customer_id: cust1.id,
});
assert(creditSale.id > 0, 'Credit sale created');
assert(getCustomerById(cust1.id)!.current_balance_minor === 450000, 'Customer balance increased to 450000');

// Exceed credit limit (limit 1500000, balance 450000, try 1200000 more)
try {
  createSale({
    items: [{ variant_id: var10kg.id, quantity: 5000, discount_minor: 0, is_manual: false }],
    payments: [{ payment_method: 'credit', amount_minor: 1400000 }],
    discount_minor: 0,
    customer_id: cust1.id,
  });
  assert(false, 'Credit limit should be enforced');
} catch { assert(true, 'Credit limit enforcement works ✓'); }

recordCustomerPayment({ customer_id: cust1.id, amount_minor: 200000, payment_method: 'cash' });
assert(getCustomerById(cust1.id)!.current_balance_minor === 250000, 'Balance reduced after payment: 250000');

try {
  createSale({
    items: [{ variant_id: var5kg.id, quantity: 1000, discount_minor: 0 }],
    payments: [{ payment_method: 'credit', amount_minor: 150000 }],
    discount_minor: 0,
  });
  assert(false, 'Credit without customer_id should throw');
} catch { assert(true, 'Credit without customer_id rejected ✓'); }

// ════════════════════════════════════════════════════════════
section('13. POS — Manual Sale (Out-of-Stock Override)');
// ════════════════════════════════════════════════════════════

assert(stockOf(varChips.id) === 3000, 'Chips initial stock = 3000');
createSale({
  items: [{ variant_id: varChips.id, quantity: 3000, discount_minor: 0, is_manual: false }],
  payments: [{ payment_method: 'cash', amount_minor: 15000 }],
  discount_minor: 0,
});
assert(stockOf(varChips.id) === 0, 'Chips exhausted to 0');

try {
  createSale({
    items: [{ variant_id: varChips.id, quantity: 1000, discount_minor: 0, is_manual: false }],
    payments: [{ payment_method: 'cash', amount_minor: 5000 }],
    discount_minor: 0,
  });
  assert(false, 'Normal sale on zero-stock should throw');
} catch { assert(true, 'Normal sale on zero-stock rejected ✓'); }

const manSale = createSale({
  items: [{ variant_id: varChips.id, quantity: 20000, discount_minor: 0, is_manual: true }],
  payments: [{ payment_method: 'cash', amount_minor: 100000 }],
  discount_minor: 0,
  notes: 'Manual override',
});
assert(manSale.id > 0, 'Manual sale created on zero-stock');
assert(manSale.items?.[0]?.is_manual === true, 'is_manual = true on manual sale item');
assert(stockOf(varChips.id) === -20000, `Stock goes negative after manual: ${stockOf(varChips.id)}`);

const chipsMovs = listMovements({ variant_id: varChips.id });
assert(chipsMovs.some((m) => m.reference_type === 'MANUAL_SALE'), 'MANUAL_SALE movement recorded');

// ════════════════════════════════════════════════════════════
section('14. POS — Held Bills');
// ════════════════════════════════════════════════════════════

const heldInput = {
  items: [{
    variant_id: var5kg.id, product_name: 'Rice', variant_name: '5KG', sku: 'RICE-5KG',
    selling_price_minor: 150000, available_stock: 50000, quantity: 2000, discount_minor: 0, is_manual: false, is_out_of_stock: false,
  }],
  discount_minor: 0,
  notes: 'Customer at ATM',
};
const held1 = holdBill(heldInput);
assert(held1.id > 0, 'Bill held successfully');
assert(held1.notes === 'Customer at ATM', 'Held bill notes correct');

const heldList = getHeldBills();
assert(heldList.some((b) => b.id === held1.id), 'Held bill appears in list');

const resumed = resumeHeldBill(held1.id);
assert(resumed.id === held1.id, 'Resumed bill has correct ID');
assert(!getHeldBills().some((b) => b.id === held1.id), 'Resumed bill removed from list');

const held2 = holdBill({ ...heldInput, notes: 'Delete test' });
deleteHeldBill(held2.id);
assert(!getHeldBills().some((b) => b.id === held2.id), 'Deleted held bill removed');

try { holdBill({ items: [], discount_minor: 0 }); assert(false, 'Empty bill hold should throw'); }
catch { assert(true, 'Empty bill hold rejected ✓'); }

// ════════════════════════════════════════════════════════════
section('15. Sale Void & Stock Reversal');
// ════════════════════════════════════════════════════════════

const juiceBefore15 = stockOf(varJuice.id);
const saleToVoid = createSale({
  items: [{ variant_id: varJuice.id, quantity: 5000, discount_minor: 0, is_manual: false }],
  payments: [{ payment_method: 'cash', amount_minor: 60000 }],
  discount_minor: 0,
});
assert(stockOf(varJuice.id) === juiceBefore15 - 5000, 'Stock reduced before void');
const voided = voidSale(saleToVoid.id);
assert(voided.status === 'cancelled', 'Voided sale is cancelled');
assert(stockOf(varJuice.id) === juiceBefore15, `Stock restored after void: expected ${juiceBefore15} got ${stockOf(varJuice.id)}`);

try { voidSale(voided.id); assert(false, 'Double void should throw'); }
catch { assert(true, 'Double void rejected \u2713'); }

// Credit sale void reverses customer balance
const custBal15 = getCustomerById(cust1.id)!.current_balance_minor;
const cvoid = createSale({
  items: [{ variant_id: var5kg.id, quantity: 1000, discount_minor: 0, is_manual: false }],
  payments: [{ payment_method: 'credit', amount_minor: 150000 }],
  discount_minor: 0, customer_id: cust1.id,
});
assert(getCustomerById(cust1.id)!.current_balance_minor === custBal15 + 150000, 'Balance increased after credit');
voidSale(cvoid.id);
assert(getCustomerById(cust1.id)!.current_balance_minor === custBal15, 'Balance restored after credit void');

// ════════════════════════════════════════════════════════════
section('16. Sale Search & History');
// ════════════════════════════════════════════════════════════

const completed = searchSales({ status: 'completed' });
assert(completed.length >= 5, `searchSales completed >= 5 (got ${completed.length})`);
const cancelled = searchSales({ status: 'cancelled' });
assert(cancelled.length >= 1, `searchSales cancelled >= 1 (got ${cancelled.length})`);
const byInv = searchSales({ search: cashSale.invoice_number });
assert(byInv.length >= 1, 'Search by exact invoice number works');

// ════════════════════════════════════════════════════════════
section('17. Mixed Payment Sale (Cash + Credit)');
// ════════════════════════════════════════════════════════════

const custBal17 = getCustomerById(cust1.id)!.current_balance_minor;
const mixedSale = createSale({
  items: [{ variant_id: var5kg.id, quantity: 2000, discount_minor: 0, is_manual: false }],
  payments: [
    { payment_method: 'cash', amount_minor: 100000 },
    { payment_method: 'credit', amount_minor: 200000 },
  ],
  discount_minor: 0,
  customer_id: cust1.id,
});
assert(mixedSale.id > 0, 'Mixed payment sale created');
assert(mixedSale.payments?.length === 2, 'Mixed sale has 2 payment records');
assert(getCustomerById(cust1.id)!.current_balance_minor === custBal17 + 200000, 'Customer balance increased by credit portion only');

// ════════════════════════════════════════════════════════════
section('18. Edge Cases & Negative Input Validation');
// ════════════════════════════════════════════════════════════

try { createSale({ items: [], payments: [{ payment_method: 'cash', amount_minor: 100 }], discount_minor: 0 }); assert(false, 'Empty items should throw'); }
catch { assert(true, 'Empty items rejected \u2713'); }

try { createSale({ items: [{ variant_id: var5kg.id, quantity: 1000, discount_minor: 0 }], payments: [], discount_minor: 0 }); assert(false, 'No payments should throw'); }
catch { assert(true, 'No payments rejected \u2713'); }

try { createSale({ items: [{ variant_id: var5kg.id, quantity: 1000, discount_minor: 0 }], payments: [{ payment_method: 'cash', amount_minor: 1 }], discount_minor: 0 }); assert(false, 'Underpayment should throw'); }
catch { assert(true, 'Underpayment rejected \u2713'); }

try { createSale({ items: [{ variant_id: var5kg.id, quantity: 1000, discount_minor: 0 }], payments: [{ payment_method: 'cash', amount_minor: -100 }], discount_minor: 0 }); assert(false, 'Negative payment should throw'); }
catch { assert(true, 'Negative payment rejected \u2713'); }

try { createSale({ items: [{ variant_id: 999999, quantity: 1000, discount_minor: 0 }], payments: [{ payment_method: 'cash', amount_minor: 9999 }], discount_minor: 0 }); assert(false, 'Invalid variant ID should throw'); }
catch { assert(true, 'Invalid variant ID rejected \u2713'); }

try { createSale({ items: [{ variant_id: var5kg.id, quantity: 0, discount_minor: 0 }], payments: [{ payment_method: 'cash', amount_minor: 100 }], discount_minor: 0 }); assert(false, 'Zero quantity should throw'); }
catch { assert(true, 'Zero quantity rejected \u2713'); }

// ════════════════════════════════════════════════════════════
section('19. Settings & Store Configuration');
// ════════════════════════════════════════════════════════════

setManySettings({ 'store.name': 'Kings Mart', 'store.phone': '042-1234567', 'store.address': 'Lahore, Pakistan' });
const s = getAllSettings();
assert(s['store.name'] === 'Kings Mart', `Store name: ${String(s['store.name'])}`);
assert(s['store.phone'] === '042-1234567', `Store phone: ${String(s['store.phone'])}`);
assert(s['store.address'] === 'Lahore, Pakistan', `Store address: ${String(s['store.address'])}`);

// ════════════════════════════════════════════════════════════
section('20. Database Integrity Verification');
// ════════════════════════════════════════════════════════════

assert(sqlite.pragma('foreign_keys', { simple: true }) === 1, 'Foreign keys ON');
assert(sqlite.pragma('journal_mode', { simple: true }) === 'wal', 'WAL mode active');
assert(existsSync(testDbPath), 'DB file exists on disk');

const allSalesForUniq = searchSales({});
const invoiceNums = allSalesForUniq.map((s) => s.invoice_number);
const uniq = new Set(invoiceNums);
assert(uniq.size === invoiceNums.length, `All ${invoiceNums.length} invoice numbers are unique`);

const completedFull = searchSales({ status: 'completed' });
const missingPayments = completedFull.filter((s) => { const d = getSaleById(s.id); return !d.payments?.length; });
assert(missingPayments.length === 0, `All completed sales have payments (violations: ${missingPayments.length})`);

const missingItems = completedFull.filter((s) => { const d = getSaleById(s.id); return !d.items?.length; });
assert(missingItems.length === 0, `All completed sales have items (violations: ${missingItems.length})`);

// ════════════════════════════════════════════════════════════
section('21. Hardware API (Structural Verification)');
// ════════════════════════════════════════════════════════════

skip('Test print dispatch', 'Requires Electron main process + printer');
skip('Cash drawer pulse', 'Requires Electron + serial port');
skip('Printer enumeration', 'Requires Electron BrowserWindow');

// IPC channels structural check
import('../src/shared/ipc/channels').then(({ IPC_CHANNELS }) => {
  console.log(`  \u2139\ufe0f  IPC_CHANNELS.HARDWARE: GET_PRINTERS="${IPC_CHANNELS.HARDWARE.GET_PRINTERS}", TEST_PRINT="${IPC_CHANNELS.HARDWARE.TEST_PRINT}", OPEN_DRAWER="${IPC_CHANNELS.HARDWARE.OPEN_DRAWER}"`);
}).catch(() => {/* ignore in sync context */});

} catch (fatal) {
  console.error('\n\ud83d\udca5 FATAL ERROR:', fatal);
  failed++;
  failures.push(`FATAL: ${fatal instanceof Error ? fatal.message : String(fatal)}`);
}

// ─── Cleanup ─────────────────────────────────────────────────
try { sqlite.close(); if (existsSync(testDbPath)) unlinkSync(testDbPath); } catch {/* ignore */}

// ─── Summary ─────────────────────────────────────────────────
console.log(`\n${'='.repeat(62)}`);
console.log('  COMPREHENSIVE TEST RESULTS');
console.log('='.repeat(62));
console.log(`  \u2705 Passed  : ${passed}`);
console.log(`  \u274c Failed  : ${failed}`);
console.log(`  \u26a0\ufe0f  Skipped : ${skipped}`);
console.log(`  \ud83d\udcca Total   : ${passed + failed + skipped}`);
if (failures.length > 0) {
  console.log('\n  \u2500 Failed Tests \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500');
  failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
}
console.log('='.repeat(62));
process.exit(failed > 0 ? 1 : 0);
