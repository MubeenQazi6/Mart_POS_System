/* eslint-disable @typescript-eslint/no-deprecated */
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  description: text('description'),
  sort_order: integer('sort_order').default(0).notNull(),
  is_active: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
});

export const brands = sqliteTable('brands', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  is_active: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
});

export const units = sqliteTable('units', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  abbreviation: text('abbreviation').notNull(), // e.g., KG, PC, LTR
  decimals: integer('decimals').default(0).notNull(), // e.g., 0 for pieces, 3 for KG
  is_active: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
});

export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  category_id: integer('category_id').notNull().references(() => categories.id),
  brand_id: integer('brand_id').references(() => brands.id),
  is_active: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  categoryIdIdx: index('idx_products_category_id').on(table.category_id),
  nameIdx: index('idx_products_name').on(table.name),
}));

export const productVariants = sqliteTable('product_variants', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  product_id: integer('product_id').notNull().references(() => products.id),
  variant_name: text('variant_name').notNull(), // e.g., "1 KG", "Pack of 6", "Single"
  sku: text('sku').unique(),
  unit_id: integer('unit_id').notNull().references(() => units.id),
  purchase_price_minor: integer('purchase_price_minor').notNull(),
  selling_price_minor: integer('selling_price_minor').notNull(),
  min_stock_alert: integer('min_stock_alert').default(0).notNull(), // Scaled by 1000
  is_active: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  productIdIdx: index('idx_product_variants_product_id').on(table.product_id),
  skuIdx: index('idx_product_variants_sku').on(table.sku),
}));

export const productBarcodes = sqliteTable('product_barcodes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  variant_id: integer('variant_id').notNull().references(() => productVariants.id),
  barcode: text('barcode').notNull().unique(),
  barcode_type: text('barcode_type').notNull(),
  is_primary: integer('is_primary', { mode: 'boolean' }).default(false).notNull(),
  is_active: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  variantIdIdx: index('idx_product_barcodes_variant_id').on(table.variant_id),
  barcodeIdx: index('idx_product_barcodes_barcode').on(table.barcode),
}));
