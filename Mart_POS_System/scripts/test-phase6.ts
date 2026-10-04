/**
 * MARTPOS Phase 6 — Inventory Management Automated Test Suite
 *
 * Tests the complete inventory engine in an isolated SQLite database:
 * 1.  Variant with no movements has stock 0
 * 2.  Opening stock IN increases stock
 * 3.  OUT movement decreases stock
 * 4.  Manual IN works
 * 5.  Manual OUT works
 * 6.  Damage decreases stock
 * 7.  Expiry decreases stock
 * 8.  Multiple movements aggregate correctly
 * 9.  Low-stock detection works
 * 10. Out-of-stock detection works
 * 11. Inventory valuation uses purchase price
 * 12. Invalid variant ID is rejected
 * 13. Invalid quantity is rejected
 * 14. Manual adjustment without direction is rejected
 * 15. Transaction behavior is correct (rollback on error)
 * 16. Movement history returns correct records
 * 17. Variant stock is calculated correctly
 * 18. Existing sale OUT movement remains compatible
 */

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../src/database/schema/index';
import * as dbClient from '../src/database/client/index';
import {
  createCategory,
  createUnit,
} from '../src/repositories/catalog';
import { createProduct } from '../src/repositories/products';
import {
  getVariantStock,
  listStockSummary,
  listMovements,
  createMovement,
  getInventoryKpis,
  computeStockStatus,
} from '../src/repositories/inventory';
import { createSale } from '../src/repositories/sales';
import { eq } from 'drizzle-orm';
import { join } from 'path';
import { tmpdir } from 'os';
import { unlinkSync, existsSync } from 'fs';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failedTests++;
  }
}

function assertThrows(fn: () => unknown, expectedFragment: string, message: string): void {
  try {
    fn();
    console.error(`  [FAIL] ${message} — Expected an error but none was thrown`);
    failedTests++;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes(expectedFragment.toLowerCase())) {
      console.log(`  [PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] ${message} — Got unexpected error: ${msg}`);
      failedTests++;
    }
  }
}

function runTests(): void {
  console.log('====================================================');
  console.log('MARTPOS Phase 6 Automated Test Suite (Isolated DB)');
  console.log('====================================================\n');

  const testDbPath = join(tmpdir(), `martpos-test-phase6-${String(Date.now())}.db`);
  console.log(`[Setup] Creating isolated test database at: ${testDbPath}`);

  const sqlite = new Database(testDbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  dbClient.setDb(db);

  try {
    // Run all migrations
    console.log('[Setup] Running migrations...');
    const migrationsFolder = join(process.cwd(), 'src', 'database', 'migrations');
    migrate(db, { migrationsFolder });
    console.log('[Setup] Migrations applied successfully.\n');

    // --- SETUP: Create catalog fixtures ---
    console.log('--- Setup: Creating catalog fixtures ---');
    const cat = createCategory({ name: 'Grocery' });
    const unitPc = createUnit({ name: 'Piece', abbreviation: 'PC', decimals: 0 });
    const unitKg = createUnit({ name: 'Kilogram', abbreviation: 'KG', decimals: 3 });

    // Product A: Rice (single variant, min stock alert = 5 units)
    const rice = createProduct({
      name: 'Basmati Rice',
      category_id: cat.id,
      variants: [
        {
          variant_name: '1 KG Bag',
          sku: 'RICE-1KG',
          unit_id: unitKg.id,
          purchase_price_minor: 30000,  // Rs. 300.00 per KG
          selling_price_minor: 35000,
          min_stock_alert: 5000,        // 5 KG minimum alert
        },
      ],
    });
    const vRice = rice.variants?.[0];
    if (!vRice) throw new Error('Rice variant fixture failed');

    // Product B: Biscuits (single variant, no min stock alert)
    const biscuit = createProduct({
      name: 'Digestive Biscuits',
      category_id: cat.id,
      variants: [
        {
          variant_name: 'Pack of 24',
          sku: 'BISC-24',
          unit_id: unitPc.id,
          purchase_price_minor: 15000,  // Rs. 150.00 per pack
          selling_price_minor: 18000,
          min_stock_alert: 0,           // No alert configured
        },
      ],
    });
    const vBiscuit = biscuit.variants?.[0];
    if (!vBiscuit) throw new Error('Biscuit variant fixture failed');

    console.log('[Setup] Fixtures created successfully.\n');

    // ======================================================
    // Part 1: Stock Status Logic Tests
    // ======================================================
    console.log('--- 1. Stock Status Computation ---');

    // Test 1: Variant with no movements has stock 0
    const stockInitial = getVariantStock(vRice.id);
    assert(stockInitial.current_stock === 0, '1. Variant with no movements has stock 0');

    // Test 9 (setup): computeStockStatus logic
    assert(
      computeStockStatus(0, 5000) === 'out_of_stock',
      '1a. computeStockStatus: stock=0, minAlert=5000 → out_of_stock',
    );
    assert(
      computeStockStatus(-1000, 0) === 'out_of_stock',
      '1b. computeStockStatus: negative stock → out_of_stock',
    );
    assert(
      computeStockStatus(3000, 5000) === 'low_stock',
      '1c. computeStockStatus: stock=3000, minAlert=5000 → low_stock',
    );
    assert(
      computeStockStatus(5000, 5000) === 'low_stock',
      '1d. computeStockStatus: stock=minAlert → low_stock (inclusive)',
    );
    assert(
      computeStockStatus(10000, 5000) === 'in_stock',
      '1e. computeStockStatus: stock>minAlert → in_stock',
    );
    assert(
      computeStockStatus(10000, 0) === 'in_stock',
      '1f. computeStockStatus: minAlert=0 → in_stock when stock > 0',
    );

    // ======================================================
    // Part 2: Opening Stock
    // ======================================================
    console.log('\n--- 2. Opening Stock ---');

    // Test 2: Opening stock IN increases stock
    const openingMovement = createMovement({
      variant_id: vRice.id,
      adjustment_type: 'opening_stock',
      quantity: 20000, // 20 KG
      notes: 'Initial rice stock',
    });
    assert(openingMovement.id > 0, '2. Opening stock movement created with ID');
    assert(openingMovement.direction === 'in', '2a. Opening stock movement direction is "in"');

    const stockAfterOpening = getVariantStock(vRice.id);
    assert(stockAfterOpening.current_stock === 20000, '2b. Opening stock IN increases stock to 20000');
    assert(stockAfterOpening.stock_status === 'in_stock', '2c. Status is in_stock after opening stock');

    // ======================================================
    // Part 3: Manual Adjustments
    // ======================================================
    console.log('\n--- 3. Manual Adjustments ---');

    // Test 4: Manual IN
    const manualIn = createMovement({
      variant_id: vRice.id,
      adjustment_type: 'manual_adjustment',
      direction: 'in',
      quantity: 5000, // 5 KG
      notes: 'Received extra stock from supplier',
    });
    assert(manualIn.direction === 'in', '4. Manual IN direction is "in"');

    const stockAfterManualIn = getVariantStock(vRice.id);
    assert(stockAfterManualIn.current_stock === 25000, '4a. Manual IN adds to stock (25000 = 20000 + 5000)');

    // Test 5: Manual OUT
    const manualOut = createMovement({
      variant_id: vRice.id,
      adjustment_type: 'manual_adjustment',
      direction: 'out',
      quantity: 3000, // 3 KG
      notes: 'Stock correction — counted 3 KG short',
    });
    assert(manualOut.direction === 'out', '5. Manual OUT direction is "out"');

    const stockAfterManualOut = getVariantStock(vRice.id);
    assert(stockAfterManualOut.current_stock === 22000, '5a. Manual OUT subtracts from stock (22000 = 25000 - 3000)');

    // Test 3: OUT movement decreases stock (general)
    assert(
      stockAfterManualOut.current_stock < stockAfterManualIn.current_stock,
      '3. OUT movement decreases stock (general: 22000 < 25000 after OUT)',
    );

    // ======================================================
    // Part 4: Damage & Expiry
    // ======================================================
    console.log('\n--- 4. Damage & Expiry ---');

    // Test 6: Damage decreases stock
    const damageMovement = createMovement({
      variant_id: vRice.id,
      adjustment_type: 'damage',
      quantity: 2000, // 2 KG damaged
      notes: 'Water damage in storage',
    });
    assert(damageMovement.direction === 'out', '6. Damage movement direction is "out"');

    const stockAfterDamage = getVariantStock(vRice.id);
    assert(stockAfterDamage.current_stock === 20000, '6a. Damage decreases stock (20000 = 22000 - 2000)');

    // Test 7: Expiry decreases stock
    const expiryMovement = createMovement({
      variant_id: vRice.id,
      adjustment_type: 'expiry',
      quantity: 1000, // 1 KG expired
      notes: 'Past best-before date',
    });
    assert(expiryMovement.direction === 'out', '7. Expiry movement direction is "out"');

    const stockAfterExpiry = getVariantStock(vRice.id);
    assert(stockAfterExpiry.current_stock === 19000, '7a. Expiry decreases stock (19000 = 20000 - 1000)');

    // ======================================================
    // Part 5: Aggregation & Low Stock
    // ======================================================
    console.log('\n--- 5. Aggregation & Low Stock ---');

    // Test 8: Multiple movements aggregate correctly
    // Rice now has: 20000 (opening) + 5000 (manual in) - 3000 (manual out) - 2000 (damage) - 1000 (expiry) = 19000
    assert(stockAfterExpiry.current_stock === 19000, '8. Multiple movements aggregate correctly (sum = 19000)');

    // Test 9: Low-stock detection
    // Rice min_stock_alert = 5000, current = 19000 → in_stock
    assert(stockAfterExpiry.stock_status === 'in_stock', '9a. Status is in_stock when stock > min alert');

    // Deplete rice down to below min stock alert
    createMovement({
      variant_id: vRice.id,
      adjustment_type: 'manual_adjustment',
      direction: 'out',
      quantity: 15000, // brings to 4000 — below 5000 alert
      notes: 'Test: deplete below alert',
    });
    const stockLow = getVariantStock(vRice.id);
    assert(stockLow.stock_status === 'low_stock', '9. Low-stock detection: stock < min alert → low_stock');
    assert(stockLow.current_stock === 4000, '9b. Stock correctly computed as 4000 after depletion');

    // Test 10: Out-of-stock detection
    createMovement({
      variant_id: vRice.id,
      adjustment_type: 'manual_adjustment',
      direction: 'out',
      quantity: 4000, // brings to 0
      notes: 'Test: deplete to zero',
    });
    const stockZero = getVariantStock(vRice.id);
    assert(stockZero.stock_status === 'out_of_stock', '10. Out-of-stock: stock=0 → out_of_stock');
    assert(stockZero.current_stock === 0, '10a. Stock is exactly 0');

    // ======================================================
    // Part 6: Inventory Valuation
    // ======================================================
    console.log('\n--- 6. Inventory Valuation ---');

    // Test 11: Inventory valuation uses purchase price
    // Set up biscuit with some stock
    createMovement({
      variant_id: vBiscuit.id,
      adjustment_type: 'opening_stock',
      quantity: 10000, // 10 packs
      notes: 'Biscuit opening stock',
    });
    const biscuitStock = getVariantStock(vBiscuit.id);
    assert(biscuitStock.current_stock === 10000, '11a. Biscuit has 10000 stock (10 packs)');

    // Expected valuation:
    // Rice: 0 stock × 30000 purchase = 0
    // Biscuit: 10 packs × 15000 purchase = 150000 (value = stock/1000 * purchase_price)
    // = (10000 / 1000) * 15000 = 150000 minor
    const kpis = getInventoryKpis();
    assert(kpis.inventory_value_minor === 150000, `11. Inventory value uses purchase price: ${String(kpis.inventory_value_minor)} == 150000`);
    // Verify it's NOT using selling price (10 packs × 18000 selling = 180000 minor — different)
    assert(kpis.inventory_value_minor !== 180000, '11b. Inventory valuation does NOT use selling price (180000)');

    // ======================================================
    // Part 7: Validation / Error Cases
    // ======================================================
    console.log('\n--- 7. Validation & Error Cases ---');

    // Test 12: Invalid variant ID is rejected
    assertThrows(
      () => { createMovement({ variant_id: 0, adjustment_type: 'opening_stock', quantity: 1000 }); },
      'variant id',
      '12. Invalid variant ID (0) is rejected',
    );
    assertThrows(
      () => { createMovement({ variant_id: 99999, adjustment_type: 'opening_stock', quantity: 1000 }); },
      'not found',
      '12a. Non-existent variant ID (99999) is rejected',
    );
    assertThrows(
      () => { getVariantStock(99999); },
      'not found',
      '12b. getVariantStock rejects non-existent variant',
    );

    // Test 13: Invalid quantity is rejected
    assertThrows(
      () => {
        createMovement({ variant_id: vBiscuit.id, adjustment_type: 'opening_stock', quantity: 0 });
      },
      'positive',
      '13. Zero quantity is rejected',
    );
    assertThrows(
      () => {
        createMovement({ variant_id: vBiscuit.id, adjustment_type: 'opening_stock', quantity: -1000 });
      },
      'positive',
      '13a. Negative quantity is rejected',
    );

    // Test 14: Manual adjustment without direction is rejected
    assertThrows(
      () => {
        createMovement({
          variant_id: vBiscuit.id,
          adjustment_type: 'manual_adjustment',
          quantity: 1000,
          notes: 'Missing direction',
        });
      },
      'direction',
      '14. Manual adjustment without direction is rejected',
    );

    // Also verify that invalid variant ID check in listMovements works
    assertThrows(
      () => { listMovements({ variant_id: -5 }); },
      'variant id',
      '14a. listMovements rejects invalid variant_id',
    );

    // ======================================================
    // Part 8: Transaction Behavior
    // ======================================================
    console.log('\n--- 8. Transaction Safety ---');

    // Test 15: Transaction rolls back on error
    const stockBeforeTx = getVariantStock(vBiscuit.id).current_stock;
    let txError = false;
    try {
      // This should fail because variant 99999 does not exist
      createMovement({ variant_id: 99999, adjustment_type: 'opening_stock', quantity: 5000 });
    } catch {
      txError = true;
    }
    const stockAfterTx = getVariantStock(vBiscuit.id).current_stock;
    assert(txError, '15. Transaction throws on invalid variant');
    assert(
      stockBeforeTx === stockAfterTx,
      '15a. Transaction rollback: biscuit stock unchanged after failed movement',
    );

    // ======================================================
    // Part 9: Movement History
    // ======================================================
    console.log('\n--- 9. Movement History ---');

    // Test 16: Movement history returns correct records (most recent first)
    const riceMovements = listMovements({ variant_id: vRice.id });
    assert(riceMovements.length >= 6, `16. Movement history returns all rice movements: ${String(riceMovements.length)}`);
    // Should be ordered most recent first
    for (let i = 0; i < riceMovements.length - 1; i++) {
      const a = riceMovements[i];
      const b = riceMovements[i + 1];
      if (a && b) {
        assert(
          a.created_at >= b.created_at,
          `16a. Movement ${String(i + 1)} is ordered most-recent-first (${a.created_at} >= ${b.created_at})`,
        );
      }
    }
    // All movements belong to rice variant
    assert(
      riceMovements.every((m) => m.variant_id === vRice.id),
      '16b. All movement history records belong to the queried variant',
    );

    // Test 17: Variant stock calculated correctly from listStockSummary
    const allSummary = listStockSummary({ is_active: true });
    const riceSummary = allSummary.find((r) => r.variant_id === vRice.id);
    const biscuitSummary = allSummary.find((r) => r.variant_id === vBiscuit.id);
    assert(
      riceSummary?.current_stock === 0,
      `17. listStockSummary: rice current_stock=0 (got ${String(riceSummary?.current_stock)})`,
    );
    assert(
      biscuitSummary?.current_stock === 10000,
      `17a. listStockSummary: biscuit current_stock=10000 (got ${String(biscuitSummary?.current_stock)})`,
    );

    // ======================================================
    // Part 10: Sale OUT Compatibility
    // ======================================================
    console.log('\n--- 10. Phase 5 Sale OUT Movement Compatibility ---');

    // Test 18: Existing sale OUT movement is compatible
    // First, replenish biscuit stock for the sale
    createMovement({
      variant_id: vBiscuit.id,
      adjustment_type: 'opening_stock',
      quantity: 5000, // 5 more packs for sale test
    });

    const stockBeforeSale = getVariantStock(vBiscuit.id).current_stock;
    assert(stockBeforeSale === 15000, `18a. Biscuit stock before sale: 15000 (got ${String(stockBeforeSale)})`);

    // Create a sale using the Phase 5 sales repo
    const sale = createSale({
      items: [
        { variant_id: vBiscuit.id, quantity: 3000, discount_minor: 0 }, // 3 packs
      ],
      payments: [{ payment_method: 'cash', amount_minor: 54000 }], // 3 * 18000
      discount_minor: 0,
    });
    assert(sale.id > 0, '18b. Sale created successfully');

    // Verify stock movements created by the sale
    const saleMovements = db
      .select()
      .from(schema.stockMovements)
      .where(eq(schema.stockMovements.reference_id, sale.id))
      .all();

    const saleStockMovement = saleMovements[0];
    assert(
      saleMovements.length === 1 && saleStockMovement?.movement_type === 'OUT',
      '18c. Sale created a stock OUT movement',
    );
    assert(
      saleStockMovement?.reference_type === 'SALE',
      '18d. Sale stock movement has reference_type = "SALE"',
    );
    assert(
      saleStockMovement?.quantity === 3000,
      `18e. Sale stock movement quantity = 3000 (got ${String(saleStockMovement?.quantity)})`,
    );

    // Test that the sale stock movement is included in the inventory calculation
    const stockAfterSale = getVariantStock(vBiscuit.id).current_stock;
    assert(
      stockAfterSale === 12000,
      `18. Sale OUT movement compatible with inventory calculation: 12000 = 15000 - 3000 (got ${String(stockAfterSale)})`,
    );

    // Verify listMovements includes the SALE movement
    const biscuitMovements = listMovements({ variant_id: vBiscuit.id });
    const saleMovementInHistory = biscuitMovements.find((m) => m.reference_type === 'SALE');
    assert(
      saleMovementInHistory !== undefined,
      '18f. SALE movement appears in movement history',
    );
    assert(
      saleMovementInHistory?.direction === 'out',
      '18g. SALE movement has direction "out" in movement history',
    );

    // ======================================================
    // Part 11: Low Stock Filter
    // ======================================================
    console.log('\n--- 11. Low Stock Filter ---');

    const lowStockItems = listStockSummary({ low_stock_only: true, is_active: true });
    // Rice is out of stock (stock_status = out_of_stock) — only low_stock should be returned
    const riceInLowStock = lowStockItems.find((r) => r.variant_id === vRice.id);
    const biscuitInLowStock = lowStockItems.find((r) => r.variant_id === vBiscuit.id);
    assert(riceInLowStock === undefined, '9c. Out-of-stock items are NOT included in low_stock_only filter');
    assert(biscuitInLowStock === undefined, '9d. In-stock items with no alert are NOT in low_stock_only filter');

    // Bring rice back to low stock state for the final filter test
    createMovement({
      variant_id: vRice.id,
      adjustment_type: 'opening_stock',
      quantity: 3000, // 3 KG — below alert of 5000 → low_stock
    });
    const lowStockAfterRiceRestock = listStockSummary({ low_stock_only: true, is_active: true });
    const riceNowLow = lowStockAfterRiceRestock.find((r) => r.variant_id === vRice.id);
    assert(riceNowLow !== undefined, '9e. Rice with stock=3000 < alert=5000 appears in low_stock_only filter');
    assert(riceNowLow?.stock_status === 'low_stock', '9f. Rice stock_status is low_stock');

    sqlite.close();
  } finally {
    console.log('\n[Cleanup] Removing temporary test database file...');
    try {
      if (existsSync(testDbPath)) unlinkSync(testDbPath);
      const wal = `${testDbPath}-wal`;
      const shm = `${testDbPath}-shm`;
      if (existsSync(wal)) unlinkSync(wal);
      if (existsSync(shm)) unlinkSync(shm);
      console.log('[Cleanup] Isolated test database cleaned up.');
    } catch {
      console.warn('[Cleanup] Note: Temporary files will be cleaned up by OS.');
    }
  }

  console.log('\n====================================================');
  console.log(`Phase 6 Test Results: ${String(passedTests)} Passed, ${String(failedTests)} Failed`);
  console.log('====================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests();
