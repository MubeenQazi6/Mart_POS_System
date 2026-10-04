import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../src/database/schema/index';
import * as dbClient from '../src/database/client/index';
import { createCategory, createUnit } from '../src/repositories/catalog';
import { createProduct } from '../src/repositories/products';
import { createMovement, getVariantStock, listMovements } from '../src/repositories/inventory';
import { createSale, lookupByBarcode } from '../src/repositories/sales';
import { join } from 'path';
import { tmpdir } from 'os';
import { unlinkSync, existsSync } from 'fs';

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string, detail?: string): void {
  if (condition) {
    console.log(`  [PASS] ${name}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${name}${detail ? ` - ${detail}` : ''}`);
    failed++;
  }
}

function run(): void {
  console.log('=== POS Manual Add & Stock Rules Test Suite ===\n');

  const testDbPath = join(tmpdir(), `martpos-test-manual-sale-${Date.now()}.db`);
  const sqlite = new Database(testDbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  dbClient.setDb(db);

  try {
    const migrationsFolder = join(process.cwd(), 'src', 'database', 'migrations');
    migrate(db, { migrationsFolder });

    // 1. Setup Catalog: 1 product with 0 stock
    const cat = createCategory({ name: 'Snacks' });
    const unit = createUnit({ name: 'Piece', abbreviation: 'pc', decimals: 0 });
    const prod = createProduct({
      name: 'Energy Bar 50g',
      category_id: cat.id,
      variants: [
        {
          variant_name: 'Chocolate',
          sku: 'BAR-CHOC-50G',
          unit_id: unit.id,
          purchase_price_minor: 4000,
          selling_price_minor: 8000,
          min_stock_alert: 5,
          barcodes: [{ barcode: '8900000000011', barcode_type: 'EAN13', is_primary: true }],
        },
      ],
    });

    const vId = prod.variants![0]!.id;

    // Rule 1: Initial stock is 0 -> Out of stock
    const initialStock = getVariantStock(vId);
    assert(initialStock.current_stock === 0, 'Initial stock is 0');
    assert(initialStock.stock_status === 'out_of_stock', 'Stock status is out_of_stock');

    const lookup = lookupByBarcode('8900000000011');
    assert(lookup?.available_stock === 0, 'Barcode lookup reports 0 available stock');

    // Rule 1: Regular sale of out-of-stock item is rejected
    let regularSaleBlocked = false;
    try {
      createSale({
        items: [{ variant_id: vId, quantity: 1000, discount_minor: 0, is_manual: false }],
        payments: [{ payment_method: 'cash', amount_minor: 8000 }],
        discount_minor: 0,
      });
    } catch (err) {
      regularSaleBlocked = true;
    }
    assert(regularSaleBlocked, 'Regular sale of out-of-stock item is rejected');

    // Rule 2 & 3: Manual add at POS (is_manual: true) bypasses stock check & records movement
    const manualSale = createSale({
      items: [{ variant_id: vId, quantity: 2000, discount_minor: 0, is_manual: true }],
      payments: [{ payment_method: 'cash', amount_minor: 16000 }],
      discount_minor: 0,
    });
    assert(manualSale.id > 0, 'Manual sale completes successfully');
    assert(manualSale.items?.[0]?.is_manual === true, 'Sale item is flagged is_manual: true');

    // Rule 3: Deducts stock (stock becomes -2000)
    const stockAfterManual = getVariantStock(vId);
    assert(
      stockAfterManual.current_stock === -2000,
      `Stock is deducted into negative (-2000) for manual sale (got ${stockAfterManual.current_stock})`
    );

    // Rule 3: Stock movement is recorded with reference_type = 'MANUAL_SALE'
    const movements = listMovements({ variant_id: vId });
    assert(movements.length === 1, 'Exactly one stock movement recorded');
    const m = movements[0]!;
    assert(m.movement_type === 'OUT', 'Movement type is OUT');
    assert(m.reference_type === 'MANUAL_SALE', 'Reference type is MANUAL_SALE');
    assert(m.quantity === 2000, 'Quantity is 2000');
    assert(Boolean(m.notes?.startsWith('Manual Sale')), `Notes start with "Manual Sale" (got "${m.notes ?? ''}")`);

    // Rule 4: Stock only increases via proper stock-in entries
    createMovement({
      variant_id: vId,
      quantity: 5000,
      adjustment_type: 'opening_stock',
      notes: 'Received shipment',
    });

    const stockAfterStockIn = getVariantStock(vId);
    assert(
      stockAfterStockIn.current_stock === 3000, // -2000 + 5000 = 3000
      `Stock after 5000 unit stock-in is now 3000 (-2000 + 5000 = 3000)`
    );

    // Now regular sale is allowed up to available stock (3000)
    const regularSale = createSale({
      items: [{ variant_id: vId, quantity: 2000, discount_minor: 0, is_manual: false }],
      payments: [{ payment_method: 'cash', amount_minor: 16000 }],
      discount_minor: 0,
    });
    assert(regularSale.id > 0, 'Regular sale succeeds within available stock');
    assert(getVariantStock(vId).current_stock === 1000, 'Stock after regular sale is 1000');

  } finally {
    sqlite.close();
    if (existsSync(testDbPath)) unlinkSync(testDbPath);
    const wal = `${testDbPath}-wal`;
    const shm = `${testDbPath}-shm`;
    if (existsSync(wal)) unlinkSync(wal);
    if (existsSync(shm)) unlinkSync(shm);
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run();
