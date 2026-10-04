/* eslint-disable @typescript-eslint/no-deprecated */
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const customers = sqliteTable('customers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  phone: text('phone').notNull().unique(), // Fast phone number lookup at POS & directory
  email: text('email'),
  address: text('address'),
  credit_limit_minor: integer('credit_limit_minor').default(0).notNull(), // 0 = no credit allowed or unlimited, e.g. 5000000 = Rs. 50,000 max Khata
  opening_balance_minor: integer('opening_balance_minor').default(0).notNull(), // Positive = customer owes mart (receivable)
  current_balance_minor: integer('current_balance_minor').default(0).notNull(), // Positive = customer owes mart (receivable)
  is_active: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  nameIdx: index('idx_customers_name').on(table.name),
  phoneIdx: index('idx_customers_phone').on(table.phone),
  isActiveIdx: index('idx_customers_is_active').on(table.is_active),
}));

export const customerTransactions = sqliteTable('customer_transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  customer_id: integer('customer_id').notNull().references(() => customers.id),
  transaction_type: text('transaction_type').notNull(), // SALE_CREDIT, PAYMENT, ADJUSTMENT
  amount_minor: integer('amount_minor').notNull(), // Credit sale increases balance (+), payment decreases balance (-)
  reference_type: text('reference_type'), // SALE, PAYMENT, MANUAL
  reference_id: integer('reference_id'),
  notes: text('notes'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  customerIdIdx: index('idx_customer_transactions_customer_id').on(table.customer_id),
  transactionTypeIdx: index('idx_customer_transactions_type').on(table.transaction_type),
  createdAtIdx: index('idx_customer_transactions_created_at').on(table.created_at),
}));

export const customerPayments = sqliteTable('customer_payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  customer_id: integer('customer_id').notNull().references(() => customers.id),
  payment_method: text('payment_method').notNull(), // cash, bank_transfer, card, other
  amount_minor: integer('amount_minor').notNull(),
  notes: text('notes'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  customerIdIdx: index('idx_customer_payments_customer_id').on(table.customer_id),
  createdAtIdx: index('idx_customer_payments_created_at').on(table.created_at),
}));
