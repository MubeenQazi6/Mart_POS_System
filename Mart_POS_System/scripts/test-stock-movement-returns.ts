import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../src/database/schema/index';
import * as dbClient from '../src/database/client/index';
import { createCategory, createUnit } from '../src/repositories/catalog';
import { createProduct } from '../src/repositories/products';
import { createMovement, getVariantStock, listMovements } from '../src/repositories/inventory';
import { join } from 'path';
import { tmpdir } from 'os';
import { unlinkSync, existsSync } from 'fs';

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string): void {
  if (condition) {
    console.log(`  [PASS] ${name}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${name}`);
    failed++;
  }
}

function run(): void {
  console.log('=== Testing Stock Movement Returns & Exchanges Suite ===\n');

  const testDbPath = join(tmpdir(), `martpos-test-movements-${Date.now()}.db`);
  const sqlite = new Database(testDbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  dbClient.setDb(db);

  try {
    const migrationsFolder = join(process.cwd(), 'src', 'database', 'migrations');
    migrate(db, { migrationsFolder });

    // Setup fixtures
    const cat = createCategory({ name: 'Clothing' });
    const unit = createUnit({ name: 'Piece', abbreviation: 'pc', decimals: 0 });
    const prodA = createProduct({
      name: 'Polo Shirt Red (M)',
      category_id: cat.id,
      variants: [
        {
          variant_name: 'Medium',
          sku: 'POLO-RED-M',
          unit_id: unit.id,
          purchase_price_minor: 10000,
          selling_price_minor: 20000,
          min_stock_alert: 5,
        },
      ],
    });
    const prodB = createProduct({
      name: 'Polo Shirt Blue (L)',
      category_id: cat.id,
      variants: [
        {
          variant_name: 'Large',
          sku: 'POLO-BLU-L',
          unit_id: unit.id,
          purchase_price_minor: 10000,
          selling_price_minor: 20000,
          min_stock_alert: 5,
        },
      ],
    });

    const vIdA = prodA.variants![0]!.id;
    const vIdB = prodB.variants![0]!.id;

    // 1. Initial Opening Stock for Variant A: 10 units (10000)
    createMovement({ variant_id: vIdA, quantity: 10000, adjustment_type: 'opening_stock' });
    assert(getVariantStock(vIdA).current_stock === 10000, 'Opening stock for Variant A is 10,000 (10 units)');

    // 2. Return 2 units (2000) using positive quantity with source: 'return'
    const returnMovement = createMovement({
      variant_id: vIdA,
      quantity: 2000,
      source: 'return',
      note: 'RETURN: Damaged item',
    });
    assert(returnMovement.movement_type === 'OUT', 'Return movement is mapped to OUT');
    assert(returnMovement.reference_type === 'RETURN', 'Return reference type is RETURN');
    assert(returnMovement.quantity === 2000, 'Return movement stores positive quantity 2000');
    assert(getVariantStock(vIdA).current_stock === 8000, 'Stock of Variant A is deducted to 8,000 (8 units)');

    // 3. Exchange Out: Deduct 1 unit (1000) from Variant A with source: 'exchange_out'
    const exchangeOutMovement = createMovement({
      variant_id: vIdA,
      quantity: 1000,
      source: 'exchange_out',
      note: 'EXCHANGE OUT: size_issue to Polo Shirt Blue (L)',
    });
    assert(exchangeOutMovement.movement_type === 'OUT', 'Exchange out movement is mapped to OUT');
    assert(exchangeOutMovement.reference_type === 'EXCHANGE_OUT', 'Exchange out reference type is EXCHANGE_OUT');
    assert(getVariantStock(vIdA).current_stock === 7000, 'Stock of Variant A is deducted to 7,000 (7 units)');

    // 4. Exchange In: Add 1 unit (1000) to Variant B with source: 'exchange_in'
    const exchangeInMovement = createMovement({
      variant_id: vIdB,
      quantity: 1000,
      source: 'exchange_in',
      note: 'EXCHANGE IN: from Polo Shirt Red (M)',
    });
    assert(exchangeInMovement.movement_type === 'IN', 'Exchange in movement is mapped to IN');
    assert(exchangeInMovement.reference_type === 'EXCHANGE_IN', 'Exchange in reference type is EXCHANGE_IN');
    assert(getVariantStock(vIdB).current_stock === 1000, 'Stock of Variant B is increased to 1,000 (1 unit)');

    // 5. Validation: Negative value is rejected as expected
    let negativeRejected = false;
    try {
      createMovement({
        variant_id: vIdA,
        quantity: -1000,
        source: 'return',
        note: 'Negative rejection test',
      });
    } catch (error) {
      negativeRejected = true;
    }
    assert(negativeRejected, 'Negative quantity is rejected by validation');

    // 6. List movements
    const movements = listMovements({ variant_id: vIdA });
    assert(movements.length === 3, '3 movement records found for Variant A');

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
