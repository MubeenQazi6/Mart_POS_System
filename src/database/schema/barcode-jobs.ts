/* eslint-disable @typescript-eslint/no-deprecated */
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { productVariants, productBarcodes } from './catalog';

export const barcodePrintJobs = sqliteTable('barcode_print_jobs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  variant_id: integer('variant_id').notNull().references(() => productVariants.id),
  barcode_id: integer('barcode_id').notNull().references(() => productBarcodes.id),
  quantity: integer('quantity').notNull(), // Number of physical labels to print (positive integer)
  status: text('status').notNull().default('pending'), // pending | printed | failed
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  variantIdIdx: index('idx_barcode_print_jobs_variant_id').on(table.variant_id),
  statusIdx: index('idx_barcode_print_jobs_status').on(table.status),
}));
