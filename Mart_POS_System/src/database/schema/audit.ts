/* eslint-disable @typescript-eslint/no-deprecated */
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { users } from './auth';
import { sql } from 'drizzle-orm';

export const auditLogs = sqliteTable('audit_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').references(() => users.id),
  username_snapshot: text('username_snapshot'),
  event_type: text('event_type').notNull(), // 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGOUT' | 'USER_CREATE' | 'USER_UPDATE' | 'STOCK_ADJUSTMENT' | 'PURCHASE_CREATE' | 'CREDIT_SALE' | 'KHATA_PAYMENT' | 'PASSWORD_CHANGE'
  status: text('status').notNull(), // 'SUCCESS' | 'FAILED'
  details: text('details'),
  ip_or_source: text('ip_or_source').default('local').notNull(),
  session_id: text('session_id'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  userIdIdx: index('idx_audit_logs_user_id').on(table.user_id),
  eventTypeIdx: index('idx_audit_logs_event_type').on(table.event_type),
  createdAtIdx: index('idx_audit_logs_created_at').on(table.created_at),
}));
