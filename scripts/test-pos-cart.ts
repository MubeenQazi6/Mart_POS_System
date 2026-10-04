import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../src/database/schema/index';
import { setDb } from '../src/database/client/index';
import { createCategory, createUnit } from '../src/repositories/catalog';
import { createProduct, listProducts } from '../src/repositories/products';
import { lookupByBarcode, createSale } from '../src/repositories/sales';
import { openCashSession, computeExpectedCash } from '../src/repositories/cash';
import { createMovement, getVariantStock } from '../src/repositories/inventory';
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
  dbPath = path.join(tempDir, `martpos-test-pos-${Date.now()}.db`);
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
  console.log('=== POS Cart & Barcode Comprehensive Test Suite ===');
  setup();

  try {
    // 1. Setup Catalog
    const category = createCategory({ name: 'Snacks & Beverages' });
    const unit = createUnit({ name: 'Piece', abbreviation: 'pc', decimals: 0 });

    const prodA = createProduct({
      name: 'Potato Crisps 50g',
      category_id: category.id,
      variants: [
        {
          variant_name: 'Sour Cream & Onion',
          sku: 'CHIP-SCO-50G',
          unit_id: unit.id,
          purchase_price_minor: 6000,
          selling_price_minor: 10000,
          min_stock_alert: 10,
          barcodes: [{ barcode: '8901234567890', barcode_type: 'EAN13', is_primary: true }],
        },
        {
          variant_name: 'Classic Salted',
          sku: 'CHIP-SAL-50G',
          unit_id: unit.id,
          purchase_price_minor: 5500,
          selling_price_minor: 9500,
          min_stock_alert: 10,
          barcodes: [{ barcode: '8901234567891', barcode_type: 'EAN13', is_primary: true }],
        },
      ],
    });

    // 2. Test listProducts returns populated variants for UI quick pick
    const listed = listProducts({ is_active: true });
    assert(listed.length === 1, 'listProducts returns active products');
    const firstProd = listed[0]!;
    assert(Array.isArray(firstProd.variants) && firstProd.variants!.length === 2, 'listProducts attaches populated variants array');
    assert(firstProd.variants![0]!.variant_name === 'Sour Cream & Onion', 'Variant 1 name is correct');
    assert(firstProd.variants![0]!.selling_price_minor === 10000, 'Variant 1 price is correct');

    // 3. Test Barcode Lookup
    const scanResult1 = lookupByBarcode('8901234567890');
    assert(scanResult1 !== null, 'Barcode lookup finds valid barcode');
    assert(scanResult1?.product_name === 'Potato Crisps 50g', 'Barcode lookup resolves correct product name');
    assert(scanResult1?.variant_name === 'Sour Cream & Onion', 'Barcode lookup resolves correct variant name');
    assert(scanResult1?.selling_price_minor === 10000, 'Barcode lookup resolves correct selling price');
    assert(scanResult1?.sku === 'CHIP-SCO-50G', 'Barcode lookup resolves SKU');

    const scanResultInvalid = lookupByBarcode('0000000000000');
    assert(scanResultInvalid === null, 'Non-existent barcode returns null');

    // 4. Test Search by name / SKU
    const searchByName = listProducts({ search: 'Potato', is_active: true });
    assert(searchByName.length === 1, 'Search by product name returns match');
    assert(searchByName[0]?.variants?.length === 2, 'Search results include variants for UI rendering');

    const searchBySku = listProducts({ search: 'CHIP-SAL', is_active: true });
    assert(searchBySku.length === 1, 'Search by SKU returns match');

    // 5. Test Cart Duplicate Merging & Atomic Sale Creation
    const var1 = prodA.variants![0]!;
    const var2 = prodA.variants![1]!;

    // Open cash session
    const cashSession = openCashSession({ opening_cash_minor: 50000 });
    assert(cashSession.id > 0, 'Cash session opened for POS');
    createMovement({ variant_id: var1.id, quantity: 3000, adjustment_type: 'opening_stock' });
    createMovement({ variant_id: var2.id, quantity: 1000, adjustment_type: 'opening_stock' });

    // Create sale with duplicate cart items (simulate adding same item multiple times)
    const sale = createSale({
      items: [
        { variant_id: var1.id, quantity: 1000, discount_minor: 0 },
        { variant_id: var1.id, quantity: 2000, discount_minor: 500 }, // same variant
        { variant_id: var2.id, quantity: 1000, discount_minor: 0 },
      ],
      payments: [
        { payment_method: 'cash', amount_minor: 39000 },
      ],
      discount_minor: 0,
    });

    assert(sale.id > 0, 'Sale created successfully');
    assert(sale.invoice_number.endsWith('-00001') && /^INV-\d{14}-00001$/.test(sale.invoice_number), 'Sequential invoice number generated with timestamp');
    // var1: 3000 qty @ 10000 = 30000 - 500 discount = 29500. var2: 1000 qty @ 9500 = 9500. Total = 39000
    assert(sale.total_minor === 39000, 'Authoritative total accurately calculated with duplicate merge');
    assert(sale.items!.length === 2, 'Duplicate cart items merged into 2 unique line items');

    // Verify cash drawer update
    const expectedCash = computeExpectedCash(cashSession.id);
    assert(expectedCash === 50000 + 39000, `Expected cash in drawer is updated to ${expectedCash}`);

    const outOfStockLookup = lookupByBarcode('8901234567891');
    assert(outOfStockLookup?.available_stock === 0, 'Barcode lookup reports zero available stock');
    console.log(`  [INFO] Stock after first sale: var1=${String(getVariantStock(var1.id).current_stock)}, var2=${String(getVariantStock(var2.id).current_stock)}`);
    let outOfStockRejected = false;
    try { createSale({ items: [{ variant_id: var2.id, quantity: 1000, discount_minor: 0 }], payments: [{ payment_method: 'cash', amount_minor: 9500 }], discount_minor: 0 }); } catch (error) { outOfStockRejected = true; console.log(`  [INFO] Out-of-stock error: ${error instanceof Error ? error.message : String(error)}`); }
    assert(outOfStockRejected, 'Normal sale rejects an out-of-stock product');

    let overQuantityRejected = false;
    try { createSale({ items: [{ variant_id: var1.id, quantity: 1000, discount_minor: 0 }], payments: [{ payment_method: 'cash', amount_minor: 10000 }], discount_minor: 0 }); } catch (error) { overQuantityRejected = true; console.log(`  [INFO] Over-quantity error: ${error instanceof Error ? error.message : String(error)}`); }
    assert(overQuantityRejected, 'Normal sale rejects quantity above available stock');

    const stockBeforeManual = getVariantStock(var2.id);
    const manualSale = createSale({ items: [{ variant_id: var2.id, quantity: 1000, discount_minor: 0, is_manual: true }], payments: [{ payment_method: 'cash', amount_minor: 9500 }], discount_minor: 0 });
    assert(manualSale.items?.[0]?.is_manual === true, 'Manual sale is explicitly marked', JSON.stringify(manualSale.items?.[0]));
    assert(getVariantStock(var2.id).current_stock === stockBeforeManual.current_stock - 1000, 'Manual sale deducts inventory stock (allowing negative stock)');

  } finally {
    cleanup();
  }

  console.log(`\nSummary: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

run();
