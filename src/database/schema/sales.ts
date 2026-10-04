/* eslint-disable @typescript-eslint/no-deprecated */
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { productVariants } from './catalog';
import { sql } from 'drizzle-orm';

export const sales = sqliteTable('sales', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  invoice_number: text('invoice_number').notNull().unique(),
  subtotal_minor: integer('subtotal_minor').notNull(),
  discount_minor: integer('discount_minor').default(0).notNull(),
  tax_minor: integer('tax_minor').default(0).notNull(),
  total_minor: integer('total_minor').notNull(),
  status: text('status').notNull().default('completed'), // completed, cancelled
  notes: text('notes'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  invoiceNumberIdx: index('idx_sales_invoice_number').on(table.invoice_number),
  statusIdx: index('idx_sales_status').on(table.status),
  createdAtIdx: index('idx_sales_created_at').on(table.created_at),
}));

export const saleItems = sqliteTable('sale_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sale_id: integer('sale_id').notNull().references(() => sales.id),
  variant_id: integer('variant_id').notNull().references(() => productVariants.id),
  quantity: integer('quantity').notNull(), // Scaled by 1000 (e.g. 1 piece = 1000, 1.5 KG = 1500)
  unit_price_minor: integer('unit_price_minor').notNull(), // Backend-authoritative price at time of sale
  unit_cost_minor: integer('unit_cost_minor').notNull().default(0), // Purchase cost snapshot at time of sale
  is_manual: integer('is_manual', { mode: 'boolean' }).default(false).notNull(),
  discount_minor: integer('discount_minor').default(0).notNull(), // Per-item discount
  line_total_minor: integer('line_total_minor').notNull(), // (qty/1000 * unit_price) - discount
}, (table) => ({
  saleIdIdx: index('idx_sale_items_sale_id').on(table.sale_id),
  variantIdIdx: index('idx_sale_items_variant_id').on(table.variant_id),
}));

export const salePayments = sqliteTable('sale_payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sale_id: integer('sale_id').notNull().references(() => sales.id),
  payment_method: text('payment_method').notNull(), // cash, card
  amount_minor: integer('amount_minor').notNull(),
  tendered_minor: integer('tendered_minor'),
}, (table) => ({
  saleIdIdx: index('idx_sale_payments_sale_id').on(table.sale_id),
}));

export const heldBills = sqliteTable('held_bills', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cart_data: text('cart_data').notNull(), // JSON serialized cart snapshot
  notes: text('notes'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});
