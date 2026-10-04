/* eslint-disable @typescript-eslint/no-deprecated */
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { productVariants } from './catalog';
import { sql } from 'drizzle-orm';

export const stockMovements = sqliteTable('stock_movements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  variant_id: integer('variant_id').notNull().references(() => productVariants.id),
  movement_type: text('movement_type').notNull(), // IN, OUT, ADJUST
  quantity: integer('quantity').notNull(), // Always scaled by 1000 (e.g. 1.5 KG = 1500, 1 piece = 1000)
  unit_cost_minor: integer('unit_cost_minor'),
  reference_type: text('reference_type'), // e.g. SALE, PURCHASE, RETURN
  reference_id: integer('reference_id'),
  notes: text('notes'),
  created_by: integer('created_by'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  variantIdIdx: index('idx_stock_movements_variant_id').on(table.variant_id),
  createdAtIdx: index('idx_stock_movements_created_at').on(table.created_at),
}));
