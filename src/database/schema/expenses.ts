/* eslint-disable @typescript-eslint/no-deprecated */
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { users } from './auth';
import { sql } from 'drizzle-orm';

export const expenseCategories = sqliteTable('expense_categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  is_active: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  nameIdx: index('idx_expense_categories_name').on(table.name),
  isActiveIdx: index('idx_expense_categories_is_active').on(table.is_active),
}));

export const expenses = sqliteTable('expenses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  expense_number: text('expense_number').notNull().unique(),
  category_id: integer('category_id').notNull().references(() => expenseCategories.id),
  amount_minor: integer('amount_minor').notNull(),
  payment_method: text('payment_method').notNull(),
  description: text('description'),
  expense_date: text('expense_date').notNull(),
  created_by: integer('created_by').references(() => users.id),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  status: text('status').notNull().default('POSTED'),
}, (table) => ({
  categoryIdx: index('idx_expenses_category_id').on(table.category_id),
  dateIdx: index('idx_expenses_expense_date').on(table.expense_date),
  statusIdx: index('idx_expenses_status').on(table.status),
  createdByIdx: index('idx_expenses_created_by').on(table.created_by),
}));
