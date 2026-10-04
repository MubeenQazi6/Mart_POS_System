/* eslint-disable @typescript-eslint/no-deprecated */
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { sales, saleItems } from './sales';
import { purchases, purchaseItems, suppliers } from './purchases';
import { customers } from './customers';
import { productVariants } from './catalog';

// --- Sales Returns ---
export const salesReturns = sqliteTable('sales_returns', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  return_number: text('return_number').notNull().unique(),
  sale_id: integer('sale_id').notNull().references(() => sales.id),
  customer_id: integer('customer_id').references(() => customers.id),
  refund_amount_minor: integer('refund_amount_minor').notNull(),
  refund_method: text('refund_method').notNull(), // cash, card, credit, bank_transfer, other
  reason: text('reason').notNull(),
  created_by: integer('created_by'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  saleIdx: index('idx_sales_returns_sale_id').on(table.sale_id),
  createdIdx: index('idx_sales_returns_created_at').on(table.created_at),
}));

export const salesReturnItems = sqliteTable('sales_return_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  return_id: integer('return_id').notNull().references(() => salesReturns.id),
  sale_item_id: integer('sale_item_id').notNull().references(() => saleItems.id),
  variant_id: integer('variant_id').notNull().references(() => productVariants.id),
  quantity: integer('quantity').notNull(), // Scaled by 1000
  unit_price_minor: integer('unit_price_minor').notNull(),
  refund_amount_minor: integer('refund_amount_minor').notNull(),
  return_condition: text('return_condition').notNull().default('resalable'), // resalable, damaged, defective
}, (table) => ({
  returnIdx: index('idx_sales_return_items_return_id').on(table.return_id),
  saleItemIdx: index('idx_sales_return_items_sale_item_id').on(table.sale_item_id),
}));

// --- Sales Exchanges ---
export const salesExchanges = sqliteTable('sales_exchanges', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  exchange_number: text('exchange_number').notNull().unique(),
  sale_id: integer('sale_id').notNull().references(() => sales.id),
  customer_id: integer('customer_id').references(() => customers.id),
  return_total_minor: integer('return_total_minor').notNull(),
  replacement_total_minor: integer('replacement_total_minor').notNull(),
  difference_minor: integer('difference_minor').notNull(), // >0 customer pays, <0 store refunds, =0 even
  settlement_method: text('settlement_method').notNull(), // cash, card, credit, even
  reason: text('reason').notNull(),
  created_by: integer('created_by'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  saleIdx: index('idx_sales_exchanges_sale_id').on(table.sale_id),
  createdIdx: index('idx_sales_exchanges_created_at').on(table.created_at),
}));

export const salesExchangeReturnItems = sqliteTable('sales_exchange_return_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  exchange_id: integer('exchange_id').notNull().references(() => salesExchanges.id),
  sale_item_id: integer('sale_item_id').notNull().references(() => saleItems.id),
  variant_id: integer('variant_id').notNull().references(() => productVariants.id),
  quantity: integer('quantity').notNull(), // Scaled by 1000
  unit_price_minor: integer('unit_price_minor').notNull(),
  total_amount_minor: integer('total_amount_minor').notNull(),
  return_condition: text('return_condition').notNull().default('resalable'),
}, (table) => ({
  exchangeIdx: index('idx_sales_exchange_return_items_exchange_id').on(table.exchange_id),
  saleItemIdx: index('idx_sales_exchange_return_items_sale_item_id').on(table.sale_item_id),
}));

export const salesExchangeReplacementItems = sqliteTable('sales_exchange_replacement_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  exchange_id: integer('exchange_id').notNull().references(() => salesExchanges.id),
  variant_id: integer('variant_id').notNull().references(() => productVariants.id),
  quantity: integer('quantity').notNull(), // Scaled by 1000
  unit_price_minor: integer('unit_price_minor').notNull(),
  total_amount_minor: integer('total_amount_minor').notNull(),
}, (table) => ({
  exchangeIdx: index('idx_sales_exchange_replacement_items_exchange_id').on(table.exchange_id),
  variantIdx: index('idx_sales_exchange_replacement_items_variant_id').on(table.variant_id),
}));

// --- Purchase Returns ---
export const purchaseReturns = sqliteTable('purchase_returns', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  return_number: text('return_number').notNull().unique(),
  purchase_id: integer('purchase_id').notNull().references(() => purchases.id),
  supplier_id: integer('supplier_id').notNull().references(() => suppliers.id),
  refund_amount_minor: integer('refund_amount_minor').notNull(),
  refund_method: text('refund_method').notNull(), // balance_adjustment, cash, bank_transfer, other
  reason: text('reason').notNull(),
  created_by: integer('created_by'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  purchaseIdx: index('idx_purchase_returns_purchase_id').on(table.purchase_id),
  createdIdx: index('idx_purchase_returns_created_at').on(table.created_at),
}));

export const purchaseReturnItems = sqliteTable('purchase_return_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  return_id: integer('return_id').notNull().references(() => purchaseReturns.id),
  purchase_item_id: integer('purchase_item_id').notNull().references(() => purchaseItems.id),
  variant_id: integer('variant_id').notNull().references(() => productVariants.id),
  quantity: integer('quantity').notNull(),
  unit_cost_minor: integer('unit_cost_minor').notNull(),
  refund_amount_minor: integer('refund_amount_minor').notNull(),
}, (table) => ({
  returnIdx: index('idx_purchase_return_items_return_id').on(table.return_id),
  purchaseItemIdx: index('idx_purchase_return_items_purchase_item_id').on(table.purchase_item_id),
}));

// --- Purchase Exchanges ---
export const purchaseExchanges = sqliteTable('purchase_exchanges', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  exchange_number: text('exchange_number').notNull().unique(),
  purchase_id: integer('purchase_id').notNull().references(() => purchases.id),
  supplier_id: integer('supplier_id').notNull().references(() => suppliers.id),
  return_total_minor: integer('return_total_minor').notNull(),
  replacement_total_minor: integer('replacement_total_minor').notNull(),
  difference_minor: integer('difference_minor').notNull(),
  settlement_method: text('settlement_method').notNull().default('balance_adjustment'),
  reason: text('reason').notNull(),
  created_by: integer('created_by'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  purchaseIdx: index('idx_purchase_exchanges_purchase_id').on(table.purchase_id),
  createdIdx: index('idx_purchase_exchanges_created_at').on(table.created_at),
}));

export const purchaseExchangeReturnItems = sqliteTable('purchase_exchange_return_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  exchange_id: integer('exchange_id').notNull().references(() => purchaseExchanges.id),
  purchase_item_id: integer('purchase_item_id').notNull().references(() => purchaseItems.id),
  variant_id: integer('variant_id').notNull().references(() => productVariants.id),
  quantity: integer('quantity').notNull(),
  unit_cost_minor: integer('unit_cost_minor').notNull(),
  total_amount_minor: integer('total_amount_minor').notNull(),
}, (table) => ({
  exchangeIdx: index('idx_purchase_exchange_return_items_exchange_id').on(table.exchange_id),
  purchaseItemIdx: index('idx_purchase_exchange_return_items_purchase_item_id').on(table.purchase_item_id),
}));

export const purchaseExchangeReplacementItems = sqliteTable('purchase_exchange_replacement_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  exchange_id: integer('exchange_id').notNull().references(() => purchaseExchanges.id),
  variant_id: integer('variant_id').notNull().references(() => productVariants.id),
  quantity: integer('quantity').notNull(),
  unit_cost_minor: integer('unit_cost_minor').notNull(),
  total_amount_minor: integer('total_amount_minor').notNull(),
}, (table) => ({
  exchangeIdx: index('idx_purchase_exchange_replacement_items_exchange_id').on(table.exchange_id),
  variantIdx: index('idx_purchase_exchange_replacement_items_variant_id').on(table.variant_id),
}));