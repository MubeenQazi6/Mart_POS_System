import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { join } from 'node:path';
import { mkdirSync, rmSync } from 'node:fs';
import * as schema from '../src/database/schema/index';
import { eq, like, sql } from 'drizzle-orm';

const testDir = join(process.cwd(), 'test-data-phase3');
const dbPath = join(testDir, 'test.db');
const migrationsFolder = join(process.cwd(), 'src', 'database', 'migrations');

function runTests(): void {
  console.log('--- STARTING PHASE 3 CATALOG & PRODUCTS TESTS ---');

  rmSync(testDir, { recursive: true, force: true });
  mkdirSync(testDir, { recursive: true });

  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('synchronous = NORMAL');

  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder });

  // 1. Create Category
  console.log('Test 1: Create Category');
  const cat = db.insert(schema.categories).values({
    name: 'Beverages',
    description: 'Cold drinks and juices',
    sort_order: 1,
    is_active: true,
  }).returning().get();
  if (cat.name !== 'Beverages') throw new Error('Category creation failed');
  console.log('✅ Test 1 Passed');

  // 2. Update Category
  console.log('Test 2: Update Category');
  const updatedCat = db.update(schema.categories).set({
    description: 'Updated description',
  }).where(eq(schema.categories.id, cat.id)).returning().get();
  if (updatedCat.description !== 'Updated description') throw new Error('Category update failed');
  console.log('✅ Test 2 Passed');

  // 3. Deactivate Category
  console.log('Test 3: Deactivate Category');
  const deactCat = db.update(schema.categories).set({
    is_active: false,
  }).where(eq(schema.categories.id, cat.id)).returning().get();
  if (deactCat.is_active) throw new Error('Category deactivation failed');
  console.log('✅ Test 3 Passed');

  // 4. Create Brand
  console.log('Test 4: Create Brand');
  const brand = db.insert(schema.brands).values({
    name: 'Coca-Cola Company',
    is_active: true,
  }).returning().get();
  if (brand.name !== 'Coca-Cola Company') throw new Error('Brand creation failed');
  console.log('✅ Test 4 Passed');

  // 5. Create Unit
  console.log('Test 5: Create Unit');
  const unitLiter = db.insert(schema.units).values({
    name: 'Liter',
    abbreviation: 'LTR',
    decimals: 3,
    is_active: true,
  }).returning().get();
  const unitPiece = db.insert(schema.units).values({
    name: 'Piece',
    abbreviation: 'PC',
    decimals: 0,
    is_active: true,
  }).returning().get();
  console.log(`✅ Test 5 Passed (Units ${unitLiter.name} & ${unitPiece.name})`);

  // 6. Create Product with multiple Variants & Barcodes (Atomic)
  console.log('Test 6: Create Product with 3 Variants & Barcodes');
  const prod = db.transaction((tx) => {
    const p = tx.insert(schema.products).values({
      name: 'Coca Cola',
      description: 'Carbonated soft drink',
      category_id: cat.id,
      brand_id: brand.id,
      is_active: true,
    }).returning().get();

    // Variant 1: 250 ML
    const v1 = tx.insert(schema.productVariants).values({
      product_id: p.id,
      variant_name: '250 ML',
      sku: 'COKE-250ML',
      unit_id: unitLiter.id,
      purchase_price_minor: 4000,
      selling_price_minor: 5000,
      min_stock_alert: 10000,
      is_active: true,
    }).returning().get();

    tx.insert(schema.productBarcodes).values({
      variant_id: v1.id,
      barcode: '5449000000996',
      barcode_type: 'EAN13',
      is_primary: true,
      is_active: true,
    }).run();

    // Variant 2: 500 ML
    const v2 = tx.insert(schema.productVariants).values({
      product_id: p.id,
      variant_name: '500 ML',
      sku: 'COKE-500ML',
      unit_id: unitLiter.id,
      purchase_price_minor: 7000,
      selling_price_minor: 9000,
      min_stock_alert: 5000,
      is_active: true,
    }).returning().get();

    tx.insert(schema.productBarcodes).values({
      variant_id: v2.id,
      barcode: '5449000000286',
      barcode_type: 'EAN13',
      is_primary: true,
      is_active: true,
    }).run();

    // Variant 3: 1.5 Liter
    const v3 = tx.insert(schema.productVariants).values({
      product_id: p.id,
      variant_name: '1.5 Liter',
      sku: 'COKE-1.5LTR',
      unit_id: unitLiter.id,
      purchase_price_minor: 14000,
      selling_price_minor: 18000,
      min_stock_alert: 2000,
      is_active: true,
    }).returning().get();

    tx.insert(schema.productBarcodes).values({
      variant_id: v3.id,
      barcode: '5449000000439',
      barcode_type: 'EAN13',
      is_primary: true,
      is_active: true,
    }).run();

    return p;
  });

  console.log(`✅ Test 6 Passed (Product ${prod.name} + 3 Variants created)`);

  // 7. Duplicate SKU Rejected
  console.log('Test 7: Duplicate SKU rejection');
  try {
    db.insert(schema.productVariants).values({
      product_id: prod.id,
      variant_name: 'Duplicate SKU test',
      sku: 'COKE-250ML',
      unit_id: unitLiter.id,
      purchase_price_minor: 1000,
      selling_price_minor: 2000,
    }).run();
    throw new Error('Duplicate SKU was incorrectly permitted!');
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('UNIQUE constraint failed')) {
      console.log('✅ Test 7 Passed (Duplicate SKU correctly rejected)');
    } else {
      throw e;
    }
  }

  // 8. Duplicate Barcode Rejected
  console.log('Test 8: Duplicate Barcode rejection');
  try {
    const vList = db.select().from(schema.productVariants).where(eq(schema.productVariants.product_id, prod.id)).all();
    const firstVariant = vList[0];
    if (!firstVariant) throw new Error('No variants found');
    db.insert(schema.productBarcodes).values({
      variant_id: firstVariant.id,
      barcode: '5449000000996',
      barcode_type: 'EAN13',
      is_primary: false,
    }).run();
    throw new Error('Duplicate Barcode was incorrectly permitted!');
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('UNIQUE constraint failed')) {
      console.log('✅ Test 8 Passed (Duplicate Barcode correctly rejected)');
    } else {
      throw e;
    }
  }

  // 9. Transaction Rollback on Failure
  console.log('Test 9: Transaction Rollback on Failure');
  const countRowBefore = db.select({ count: sql<number>`count(*)` }).from(schema.products).get();
  const countBefore = countRowBefore ? countRowBefore.count : 0;
  try {
    db.transaction((tx) => {
      tx.insert(schema.products).values({
        name: 'Should Rollback',
        category_id: cat.id,
        is_active: true,
      }).run();
      throw new Error('Simulated failure');
    });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'Simulated failure') {
      const countRowAfter = db.select({ count: sql<number>`count(*)` }).from(schema.products).get();
      const countAfter = countRowAfter ? countRowAfter.count : 0;
      if (countBefore !== countAfter) throw new Error('Transaction did not roll back!');
      console.log('✅ Test 9 Passed (Transaction cleanly rolled back)');
    } else {
      throw e;
    }
  }

  // 10. Search by Product Name
  console.log('Test 10: Search by Product Name');
  const nameSearchResults = db.select().from(schema.products).where(like(schema.products.name, '%Cola%')).all();
  if (nameSearchResults.length !== 1) throw new Error('Name search failed');
  console.log('✅ Test 10 Passed');

  // 11. Search by SKU
  console.log('Test 11: Search by SKU');
  const skuResults = db.select({
    productName: schema.products.name,
    variantName: schema.productVariants.variant_name,
  })
  .from(schema.products)
  .innerJoin(schema.productVariants, eq(schema.products.id, schema.productVariants.product_id))
  .where(eq(schema.productVariants.sku, 'COKE-1.5LTR'))
  .get();

  if (!skuResults || skuResults.variantName !== '1.5 Liter') throw new Error('SKU search failed');
  console.log('✅ Test 11 Passed');

  // 12. Search by Barcode
  console.log('Test 12: Search by Barcode');
  const barcodeResults = db.select({
    productName: schema.products.name,
    variantName: schema.productVariants.variant_name,
    price: schema.productVariants.selling_price_minor,
  })
  .from(schema.productBarcodes)
  .innerJoin(schema.productVariants, eq(schema.productBarcodes.variant_id, schema.productVariants.id))
  .innerJoin(schema.products, eq(schema.productVariants.product_id, schema.products.id))
  .where(eq(schema.productBarcodes.barcode, '5449000000286'))
  .get();

  if (!barcodeResults || barcodeResults.variantName !== '500 ML' || barcodeResults.price !== 9000) {
    throw new Error('Barcode search failed');
  }
  console.log('✅ Test 12 Passed (Resolved barcode to Coca Cola 500 ML @ Rs. 90.00)');

  // 13. Deactivate Variant
  console.log('Test 13: Deactivate Variant');
  const vToDeact = db.select().from(schema.productVariants).where(eq(schema.productVariants.sku, 'COKE-250ML')).get();
  if (!vToDeact) throw new Error('Variant not found');
  db.update(schema.productVariants).set({ is_active: false }).where(eq(schema.productVariants.id, vToDeact.id)).run();
  const vAfter = db.select().from(schema.productVariants).where(eq(schema.productVariants.id, vToDeact.id)).get();
  if (!vAfter || vAfter.is_active) throw new Error('Variant deactivation failed');
  console.log('✅ Test 13 Passed');

  // 14. Deactivate Barcode
  console.log('Test 14: Deactivate Barcode');
  const bToDeact = db.select().from(schema.productBarcodes).where(eq(schema.productBarcodes.barcode, '5449000000996')).get();
  if (!bToDeact) throw new Error('Barcode not found');
  db.update(schema.productBarcodes).set({ is_active: false }).where(eq(schema.productBarcodes.id, bToDeact.id)).run();
  const bAfter = db.select().from(schema.productBarcodes).where(eq(schema.productBarcodes.id, bToDeact.id)).get();
  if (!bAfter || bAfter.is_active) throw new Error('Barcode deactivation failed');
  console.log('✅ Test 14 Passed');

  // 15. Deactivate Product
  console.log('Test 15: Deactivate Product');
  db.update(schema.products).set({ is_active: false }).where(eq(schema.products.id, prod.id)).run();
  const prodAfter = db.select().from(schema.products).where(eq(schema.products.id, prod.id)).get();
  if (!prodAfter || prodAfter.is_active) throw new Error('Product deactivation failed');
  console.log('✅ Test 15 Passed');

  sqlite.close();
  rmSync(testDir, { recursive: true, force: true });
  console.log('--- ALL 15 PHASE 3 AUTOMATED TESTS PASSED CLEANLY ---');
}

try {
  runTests();
} catch (e: unknown) {
  console.error('Test suite failed:', e);
  process.exit(1);
}
