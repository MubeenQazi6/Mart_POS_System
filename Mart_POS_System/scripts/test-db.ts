import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { join } from 'node:path';
import { mkdirSync, rmSync } from 'node:fs';
import * as schema from '../src/database/schema/index';
import { sql } from 'drizzle-orm';

const testDir = join(process.cwd(), 'test-data');
const dbPath = join(testDir, 'test.db');
const migrationsFolder = join(process.cwd(), 'src', 'database', 'migrations');

function runTests(): void {
  console.log('--- STARTING DATABASE AUDIT TESTS ---');
  
  // 1 & 2. Database initialization and directory creation
  try {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
    console.log('✅ [1, 2] Directory creation successful');
  } catch (e: unknown) {
    console.error('❌ [1, 2] Directory creation failed', e);
    process.exit(1);
  }

  // 3. Database opening
  let sqlite: Database.Database;
  try {
    sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    sqlite.pragma('synchronous = NORMAL');
    console.log('✅ [3, 16] Database opening & PRAGMA configuration successful');
  } catch (e: unknown) {
    console.error('❌ [3] Database opening failed', e);
    process.exit(1);
  }

  const db = drizzle(sqlite, { schema });

  // 4. Migration
  try {
    migrate(db, { migrationsFolder });
    console.log('✅ [4] Migration successful');
  } catch (e: unknown) {
    console.error('❌ [4] Migration failed', e);
    process.exit(1);
  }

  // 5. Repeated migration
  try {
    migrate(db, { migrationsFolder });
    console.log('✅ [5] Repeated migration is safe');
  } catch (e: unknown) {
    console.error('❌ [5] Repeated migration failed', e);
    process.exit(1);
  }

  // Setup initial data for relationships
  let categoryId: number, brandId: number, unitId: number, productId: number, variantId: number;
  try {
    const cat = db.insert(schema.categories).values({ name: 'Groceries' }).returning().get();
    categoryId = cat.id;

    const brand = db.insert(schema.brands).values({ name: 'Generic' }).returning().get();
    brandId = brand.id;

    const unit = db.insert(schema.units).values({ name: 'Kilogram', abbreviation: 'KG', decimals: 3 }).returning().get();
    unitId = unit.id;

    // 13. Product -> Variant Relationship
    const prod = db.insert(schema.products).values({
      name: 'Sugar',
      category_id: categoryId,
      brand_id: brandId,
    }).returning().get();
    productId = prod.id;

    const variant = db.insert(schema.productVariants).values({
      product_id: productId,
      variant_name: '1 KG',
      sku: 'SUG-1KG',
      unit_id: unitId,
      purchase_price_minor: 10000,
      selling_price_minor: 12000,
      min_stock_alert: 5000,
    }).returning().get();
    variantId = variant.id;

    console.log('✅ [13, 17] Product -> Variant relationship and Money precision successful');
  } catch (e: unknown) {
    console.error('❌ [13, 17] Setup data failed', e);
    process.exit(1);
  }

  // 6. Foreign key enforcement
  try {
    db.insert(schema.productVariants).values({
      product_id: 9999,
      variant_name: 'Invalid',
      sku: 'INVALID-SKU',
      unit_id: unitId,
      purchase_price_minor: 100,
      selling_price_minor: 200,
    }).run();
    console.error('❌ [6] Foreign key enforcement failed (Allowed invalid product_id)');
    process.exit(1);
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('FOREIGN KEY constraint failed')) {
      console.log('✅ [6] Foreign key enforcement successful');
    } else {
      console.error('❌ [6] Unexpected error in FK test', e);
      process.exit(1);
    }
  }

  // 7. Unique barcode & 14. Variant -> Barcode relationship
  try {
    db.insert(schema.productBarcodes).values({
      variant_id: variantId,
      barcode: '291000100001',
      barcode_type: 'EAN13',
      is_primary: true,
    }).run();
    console.log('✅ [7, 14] Unique barcode & Variant -> Barcode relationship successful');
  } catch (e: unknown) {
    console.error('❌ [7, 14] Barcode insert failed', e);
    process.exit(1);
  }

  // 8. Duplicate barcode rejection
  try {
    db.insert(schema.productBarcodes).values({
      variant_id: variantId,
      barcode: '291000100001',
      barcode_type: 'EAN13',
    }).run();
    console.error('❌ [8] Duplicate barcode rejection failed (Allowed duplicate)');
    process.exit(1);
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('UNIQUE constraint failed')) {
      console.log('✅ [8] Duplicate barcode rejection successful');
    } else {
      console.error('❌ [8] Unexpected error in duplicate barcode test', e);
      process.exit(1);
    }
  }

  // 9. Unique SKU
  try {
    db.insert(schema.productVariants).values({
      product_id: productId,
      variant_name: '2 KG',
      sku: 'SUG-2KG',
      unit_id: unitId,
      purchase_price_minor: 20000,
      selling_price_minor: 24000,
    }).run();
    console.log('✅ [9] Unique SKU successful');
  } catch (e: unknown) {
    console.error('❌ [9] Unique SKU failed', e);
    process.exit(1);
  }

  // 10. Duplicate SKU rejection
  try {
    db.insert(schema.productVariants).values({
      product_id: productId,
      variant_name: 'Another 1 KG',
      sku: 'SUG-1KG',
      unit_id: unitId,
      purchase_price_minor: 10000,
      selling_price_minor: 12000,
    }).run();
    console.error('❌ [10] Duplicate SKU rejection failed (Allowed duplicate)');
    process.exit(1);
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('UNIQUE constraint failed')) {
      console.log('✅ [10] Duplicate SKU rejection successful');
    } else {
      console.error('❌ [10] Unexpected error in duplicate SKU test', e);
      process.exit(1);
    }
  }

  // 11. Transaction commit & 16. Quantity precision
  try {
    db.transaction((tx) => {
      tx.insert(schema.stockMovements).values({
        variant_id: variantId,
        movement_type: 'IN',
        quantity: 1500,
        reference_type: 'PURCHASE',
      }).run();
    });
    const stock = db.select().from(schema.stockMovements).where(sql`variant_id = ${variantId}`).get();
    if (stock && stock.quantity === 1500) {
      console.log('✅ [11, 16] Transaction commit & Quantity precision (1.5 KG = 1500) successful');
    } else {
      throw new Error('Stock not found or quantity mismatch');
    }
  } catch (e: unknown) {
    console.error('❌ [11, 16] Transaction commit failed', e);
    process.exit(1);
  }

  // 12. Transaction rollback
  try {
    db.transaction((tx) => {
      tx.insert(schema.stockMovements).values({
        variant_id: variantId,
        movement_type: 'OUT',
        quantity: 500,
        reference_type: 'SALE',
      }).run();
      throw new Error('Intentional failure');
    });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'Intentional failure') {
      const count = db.select({ count: sql<number>`count(*)` }).from(schema.stockMovements).where(sql`variant_id = ${variantId}`).get();
      if (count && count.count === 1) {
        console.log('✅ [12] Transaction rollback successful');
      } else {
        console.error('❌ [12] Transaction rollback failed (Record persisted!)');
        process.exit(1);
      }
    } else {
      console.error('❌ [12] Unexpected error in transaction rollback', e);
      process.exit(1);
    }
  }

  // 15. Barcode -> Variant lookup
  try {
    const result = db.select({
      productName: schema.products.name,
      variantName: schema.productVariants.variant_name,
      price: schema.productVariants.selling_price_minor,
    })
    .from(schema.productBarcodes)
    .innerJoin(schema.productVariants, sql`${schema.productBarcodes.variant_id} = ${schema.productVariants.id}`)
    .innerJoin(schema.products, sql`${schema.productVariants.product_id} = ${schema.products.id}`)
    .where(sql`${schema.productBarcodes.barcode} = '291000100001'`)
    .get();

    if (result && result.productName === 'Sugar' && result.variantName === '1 KG' && result.price === 12000) {
      console.log('✅ [15] Barcode -> Variant lookup successful');
    } else {
      throw new Error('Lookup failed or returned incorrect data');
    }
  } catch (e: unknown) {
    console.error('❌ [15] Barcode lookup failed', e);
    process.exit(1);
  }

  // 18. Database health
  try {
    db.get(sql`SELECT 1`);
    console.log('✅ [18] Database health check successful');
  } catch (e: unknown) {
    console.error('❌ [18] Database health check failed', e);
    process.exit(1);
  }

  // 19. Database close
  try {
    sqlite.close();
    console.log('✅ [19] Database close successful');
  } catch (e: unknown) {
    console.error('❌ [19] Database close failed', e);
    process.exit(1);
  }

  console.log('--- ALL TESTS PASSED SUCCESSFULLY ---');
}

try {
  runTests();
} catch (e: unknown) {
  console.error('Test suite failed:', e);
  process.exit(1);
}
