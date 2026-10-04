import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../src/database/schema/index';
import { setDb } from '../src/database/client/index';
import { createCategory, createUnit } from '../src/repositories/catalog';
import { createProduct } from '../src/repositories/products';
import { lookupByBarcode } from '../src/repositories/sales';
import { createMovement } from '../src/repositories/inventory';
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
  dbPath = path.join(tempDir, `martpos-test-barcode-${Date.now()}.db`);
  rawDb = new Database(dbPath);
  rawDb.pragma('journal_mode = WAL');
  rawDb.pragma('foreign_keys = ON');
  const db = drizzle(rawDb, { schema });
  setDb(db);
  migrate(db, { migrationsFolder: path.join(process.cwd(), 'src', 'database', 'migrations') });

  ensureDefaultAdmin();
  setActiveSession(
    {
      id: 1,
      username: 'admin',
      full_name: 'Administrator',
      role: 'admin',
      is_active: true,
      created_at: '',
      updated_at: '',
    },
    'test-token',
  );
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
  console.log('=== POS Barcode Scanner & Cart Addition Test Suite ===');
  setup();

  try {
    // 1. Setup Test Catalog
    const category = createCategory({ name: 'Beverages' });
    const unit = createUnit({ name: 'Bottle', abbreviation: 'btl', decimals: 0 });

    // In-stock product with barcode 8901111222233
    const prodInStock = createProduct({
      name: 'Fresh Orange Juice 1L',
      category_id: category.id,
      variants: [
        {
          variant_name: 'Original Pulp',
          sku: 'JUICE-OJ-1L',
          unit_id: unit.id,
          purchase_price_minor: 25000,
          selling_price_minor: 35000,
          min_stock_alert: 5,
          barcodes: [
            { barcode: '8901111222233', barcode_type: 'EAN13', is_primary: true },
            { barcode: '8901111222240', barcode_type: 'EAN13', is_primary: false },
          ],
        },
      ],
    });

    // Out-of-stock product with barcode 8909999888877
    const prodOutOfStock = createProduct({
      name: 'Sparkling Mineral Water 500ml',
      category_id: category.id,
      variants: [
        {
          variant_name: 'Lemon Lime',
          sku: 'WATER-SPK-LEM',
          unit_id: unit.id,
          purchase_price_minor: 10000,
          selling_price_minor: 18000,
          min_stock_alert: 5,
          barcodes: [{ barcode: '8909999888877', barcode_type: 'EAN13', is_primary: true }],
        },
      ],
    });

    const inStockVariant = prodInStock.variants![0]!;
    const outOfStockVariant = prodOutOfStock.variants![0]!;

    // Add 3 units (3000 milli-units) of stock for in-stock item
    createMovement({
      variant_id: inStockVariant.id,
      source: 'purchase_receive',
      direction: 'in',
      quantity: 3000,
      notes: 'Initial opening stock',
    });

    // 2. Test Barcode Lookup for In-Stock Item
    const scanInStock = lookupByBarcode('8901111222233');
    assert(scanInStock !== null, 'Barcode scan finds primary barcode');
    assert(scanInStock?.product_name === 'Fresh Orange Juice 1L', 'Scan resolves correct product name');
    assert(scanInStock?.variant_name === 'Original Pulp', 'Scan resolves correct variant name');
    assert(scanInStock?.selling_price_minor === 35000, 'Scan resolves correct price');
    assert(scanInStock?.available_stock === 3000, 'Scan returns exact stock available (3000 milli-units = 3 units)');
    assert(scanInStock?.sku === 'JUICE-OJ-1L', 'Scan resolves SKU');

    // 3. Test Secondary Barcode Lookup
    const scanSecondary = lookupByBarcode('8901111222240');
    assert(scanSecondary !== null, 'Barcode scan finds secondary barcode on the same variant');
    assert(scanSecondary?.variant_id === inStockVariant.id, 'Secondary barcode maps to the exact same variant ID');

    // 4. Test Non-Existent Barcode Lookup
    const scanNonExistent = lookupByBarcode('9999999999999');
    assert(scanNonExistent === null, 'Lookup for non-existent barcode safely returns null');

    // 5. Test Barcode Lookup for Out-of-Stock Item
    const scanOutOfStock = lookupByBarcode('8909999888877');
    assert(scanOutOfStock !== null, 'Barcode scan finds out-of-stock product');
    assert(scanOutOfStock?.product_name === 'Sparkling Mineral Water 500ml', 'Scan resolves out-of-stock product name');
    assert(scanOutOfStock?.available_stock === 0, 'Scan accurately reports 0 available stock');

    // 6. Simulate POS Cart Addition from Barcode Scan
    // Mirrors logic from usePosCartStore.lookupAndAddBarcode and PosPage handleScannerSubmit
    type CartItem = {
      variant_id: number;
      product_name: string;
      variant_name: string;
      sku: string;
      selling_price_minor: number;
      available_stock: number;
      barcode?: string;
      is_manual: boolean;
      quantity: number;
    };

    const cart: CartItem[] = [];

    function simulateBarcodeScan(barcode: string): { success: boolean; reason?: string } {
      const item = lookupByBarcode(barcode);
      if (!item) {
        return { success: false, reason: 'Barcode not found in catalog' };
      }

      const existingIndex = cart.findIndex((c) => c.variant_id === item.variant_id);
      const reservedQty = existingIndex >= 0 ? cart[existingIndex]!.quantity : 0;
      const remainingStock = Math.max(0, item.available_stock - reservedQty);

      if (remainingStock <= 0 && (!existingIndex || !cart[existingIndex]?.is_manual)) {
        return {
          success: false,
          reason: `${item.product_name} (${item.variant_name}) is out of stock. Use Add Manually from the product list if the physical item is available.`,
        };
      }

      if (reservedQty + 1000 > item.available_stock && !cart[existingIndex]?.is_manual) {
        return {
          success: false,
          reason: `Only ${String(remainingStock / 1000)} units are available for ${item.product_name}.`,
        };
      }

      if (existingIndex >= 0) {
        cart[existingIndex]!.quantity += 1000;
      } else {
        cart.push({
          variant_id: item.variant_id,
          product_name: item.product_name,
          variant_name: item.variant_name,
          sku: item.sku ?? '',
          selling_price_minor: item.selling_price_minor,
          available_stock: Math.max(0, item.available_stock),
          barcode: item.barcode,
          is_manual: false,
          quantity: 1000,
        });
      }

      return { success: true };
    }

    // Step A: Scan in-stock item for the first time
    const scan1 = simulateBarcodeScan('8901111222233');
    assert(scan1.success === true, 'First barcode scan adds product to cart');
    assert(cart.length === 1, 'Cart has 1 line item');
    assert(cart[0]?.quantity === 1000, 'Cart item quantity is 1000 milli-units (1 unit)');

    // Step B: Scan same barcode second time (simulate rapid scanning at checkout)
    const scan2 = simulateBarcodeScan('8901111222233');
    assert(scan2.success === true, 'Second scan of same barcode succeeds');
    assert(cart.length === 1, 'Cart still has 1 unique line item (merged, no duplicate row)');
    assert(cart[0]?.quantity === 2000, 'Quantity increments to 2000 milli-units (2 units)');

    // Step C: Scan third time (reaches maximum available stock of 3 units)
    const scan3 = simulateBarcodeScan('8901111222233');
    assert(scan3.success === true, 'Third scan reaches available stock limit');
    assert(cart[0]?.quantity === 3000, 'Quantity reaches 3000 milli-units (3 units)');

    // Step D: Scan 4th time (exceeds available stock of 3 units)
    const scan4 = simulateBarcodeScan('8901111222233');
    assert(scan4.success === false, 'Scan exceeding stock is blocked from automatic addition');
    assert(cart[0]?.quantity === 3000, 'Cart quantity remains at 3000 (not exceeded)');

    // Step E: Scan out-of-stock item barcode
    const scanOos = simulateBarcodeScan('8909999888877');
    assert(scanOos.success === false, 'Out-of-stock barcode scan is safely blocked');
    assert(scanOos.reason?.includes('out of stock') === true, 'Error message instructs to use Add Manual');

    // Step F: Test Direct Out-of-Stock Add Manual (The button fixed in PosPage)
    function simulateDirectAddManual(prod: typeof prodOutOfStock): void {
      const v = prod.variants![0]!;
      const existing = cart.find((c) => c.variant_id === v.id);
      if (existing) {
        existing.quantity += 1000;
      } else {
        cart.push({
          variant_id: v.id,
          product_name: prod.name,
          variant_name: v.variant_name,
          sku: v.sku ?? '',
          selling_price_minor: v.selling_price_minor,
          available_stock: 0,
          barcode: v.barcodes?.[0]?.barcode,
          is_manual: true,
          quantity: 1000,
        });
      }
    }

    simulateDirectAddManual(prodOutOfStock);
    assert(cart.length === 2, 'Out-of-stock manual add successfully placed in cart');
    const manualItem = cart.find((c) => c.variant_id === outOfStockVariant.id);
    assert(manualItem !== undefined, 'Manual item exists in cart');
    assert(manualItem?.is_manual === true, 'Manual item has is_manual: true flag');
    assert(manualItem?.quantity === 1000, 'Manual item quantity is 1 unit');

    // Repeat manual add increases quantity directly without opening form
    simulateDirectAddManual(prodOutOfStock);
    assert(manualItem?.quantity === 2000, 'Repeated Add Manual directly increases quantity to 2 units');

    // Step G: In-stock item (Orange Juice with 3 in stock, 3 in cart) -> Add Manual to reach 20 units
    const inStockCartItem = cart.find((c) => c.variant_id === inStockVariant.id)!;
    assert(inStockCartItem.quantity === 3000, 'Orange Juice currently has 3 units in cart');
    assert(inStockCartItem.is_manual === false, 'Initially Orange Juice was added as normal stock item');

    // Now cashier clicks Add Manual on Orange Juice (e.g. customer wants 20 units total)
    function simulateTransitionToManualAdd(variantId: number, addQty = 1000): void {
      const item = cart.find((c) => c.variant_id === variantId);
      if (item) {
        item.is_manual = true;
        item.quantity += addQty;
      }
    }

    // Add 17 more units to reach 20 units total
    for (let i = 0; i < 17; i++) {
      simulateTransitionToManualAdd(inStockVariant.id, 1000);
    }

    assert(inStockCartItem.quantity === 20000, 'Orange Juice quantity successfully scaled from 3 to 20 units via Add Manual');
    assert(inStockCartItem.is_manual === true, 'Orange Juice is now marked as manual sale');

    console.log(`\n========================================`);
    console.log(`Barcode Scanning Test Result: ${passed} passed, ${failed} failed`);
    console.log(`========================================\n`);
  } finally {
    cleanup();
  }

  if (failed > 0) {
    process.exit(1);
  }
}

run();
