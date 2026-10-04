/* eslint-disable @typescript-eslint/no-deprecated */
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { productVariants } from './catalog';
import { sql } from 'drizzle-orm';

export const suppliers = sqliteTable('suppliers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  contact_person: text('contact_person'),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  opening_balance_minor: integer('opening_balance_minor').default(0).notNull(), // Positive = we owe supplier (payable)
  current_balance_minor: integer('current_balance_minor').default(0).notNull(), // Positive = we owe supplier (payable)
  is_active: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  nameIdx: index('idx_suppliers_name').on(table.name),
  phoneIdx: index('idx_suppliers_phone').on(table.phone),
  isActiveIdx: index('idx_suppliers_is_active').on(table.is_active),
}));

export const purchases = sqliteTable('purchases', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  purchase_number: text('purchase_number').notNull().unique(), // e.g. PO-00001
  supplier_id: integer('supplier_id').notNull().references(() => suppliers.id),
  supplier_invoice_number: text('supplier_invoice_number'), // Supplier's physical paper invoice/bill #
  subtotal_minor: integer('subtotal_minor').notNull(),
  discount_minor: integer('discount_minor').default(0).notNull(),
  tax_minor: integer('tax_minor').default(0).notNull(),
  total_minor: integer('total_minor').notNull(),
  paid_amount_minor: integer('paid_amount_minor').default(0).notNull(),
  balance_minor: integer('balance_minor').default(0).notNull(), // total - paid
  payment_status: text('payment_status').default('paid').notNull(), // paid, partial, unpaid
  notes: text('notes'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  purchaseNumberIdx: index('idx_purchases_purchase_number').on(table.purchase_number),
  supplierIdIdx: index('idx_purchases_supplier_id').on(table.supplier_id),
  paymentStatusIdx: index('idx_purchases_payment_status').on(table.payment_status),
  createdAtIdx: index('idx_purchases_created_at').on(table.created_at),
}));

export const purchaseItems = sqliteTable('purchase_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  purchase_id: integer('purchase_id').notNull().references(() => purchases.id),
  variant_id: integer('variant_id').notNull().references(() => productVariants.id),
  quantity: integer('quantity').notNull(), // Scaled by 1000 (e.g. 1 piece = 1000, 1.5 KG = 1500)
  unit_cost_minor: integer('unit_cost_minor').notNull(), // Cost per unit in integer minor units
  line_total_minor: integer('line_total_minor').notNull(), // (qty/1000 * unit_cost)
}, (table) => ({
  purchaseIdIdx: index('idx_purchase_items_purchase_id').on(table.purchase_id),
  variantIdIdx: index('idx_purchase_items_variant_id').on(table.variant_id),
}));

export const purchasePayments = sqliteTable('purchase_payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  purchase_id: integer('purchase_id').references(() => purchases.id),
  supplier_id: integer('supplier_id').notNull().references(() => suppliers.id),
  payment_method: text('payment_method').notNull(), // cash, bank_transfer, cheque, other
  amount_minor: integer('amount_minor').notNull(),
  reference_number: text('reference_number'),
  notes: text('notes'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  purchaseIdIdx: index('idx_purchase_payments_purchase_id').on(table.purchase_id),
  supplierIdIdx: index('idx_purchase_payments_supplier_id').on(table.supplier_id),
}));

export const supplierTransactions = sqliteTable('supplier_transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  supplier_id: integer('supplier_id').notNull().references(() => suppliers.id),
  transaction_type: text('transaction_type').notNull(), // PURCHASE_BILL, PAYMENT, ADJUSTMENT
  amount_minor: integer('amount_minor').notNull(), // Bill increases payable (+), payment decreases payable (-)
  reference_type: text('reference_type'), // PURCHASE, PAYMENT, MANUAL
  reference_id: integer('reference_id'),
  notes: text('notes'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  supplierIdIdx: index('idx_supplier_transactions_supplier_id').on(table.supplier_id),
  transactionTypeIdx: index('idx_supplier_transactions_type').on(table.transaction_type),
  createdAtIdx: index('idx_supplier_transactions_created_at').on(table.created_at),
}));
