/* eslint-disable @typescript-eslint/no-deprecated */
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { users } from './auth';
import { sql } from 'drizzle-orm';

export const cashSessions = sqliteTable('cash_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  business_date: text('business_date').notNull(),
  opened_by: integer('opened_by').references(() => users.id),
  opened_at: text('opened_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  opening_cash_minor: integer('opening_cash_minor').notNull(),
  closed_by: integer('closed_by').references(() => users.id),
  closed_at: text('closed_at'),
  expected_cash_minor: integer('expected_cash_minor').default(0).notNull(),
  actual_cash_minor: integer('actual_cash_minor'),
  variance_minor: integer('variance_minor').default(0).notNull(),
  status: text('status').notNull().default('OPEN'),
}, (table) => ({
  businessDateIdx: index('idx_cash_sessions_business_date').on(table.business_date),
  statusIdx: index('idx_cash_sessions_status').on(table.status),
  openedByIdx: index('idx_cash_sessions_opened_by').on(table.opened_by),
}));

export const cashMovements = sqliteTable('cash_movements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  session_id: integer('session_id').notNull().references(() => cashSessions.id),
  movement_type: text('movement_type').notNull(),
  amount_minor: integer('amount_minor').notNull(),
  reference_type: text('reference_type'),
  reference_id: integer('reference_id'),
  description: text('description'),
  created_by: integer('created_by').references(() => users.id),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  sessionIdx: index('idx_cash_movements_session_id').on(table.session_id),
  typeIdx: index('idx_cash_movements_type').on(table.movement_type),
  createdAtIdx: index('idx_cash_movements_created_at').on(table.created_at),
}));
