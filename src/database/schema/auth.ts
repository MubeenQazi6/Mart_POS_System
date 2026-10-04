/* eslint-disable @typescript-eslint/no-deprecated */
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  salt: text('salt').notNull(),
  full_name: text('full_name').notNull(),
  role: text('role').default('cashier').notNull(), // 'admin' | 'store_manager' | 'cashier'
  is_active: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  usernameIdx: index('idx_users_username').on(table.username),
  roleIdx: index('idx_users_role').on(table.role),
  isActiveIdx: index('idx_users_is_active').on(table.is_active),
}));

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(), // UUID string
  user_id: integer('user_id').notNull().references(() => users.id),
  token: text('token').notNull().unique(),
  is_active: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  expires_at: text('expires_at').notNull(),
}, (table) => ({
  userIdIdx: index('idx_sessions_user_id').on(table.user_id),
  tokenIdx: index('idx_sessions_token').on(table.token),
}));

export const userScreenPermissions = sqliteTable('user_screen_permissions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').notNull().references(() => users.id),
  module_id: text('module_id').notNull(),
  is_allowed: integer('is_allowed', { mode: 'boolean' }).default(true).notNull(),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  userModuleIdx: index('idx_user_screen_perm_user_module').on(table.user_id, table.module_id),
  userIdIdx: index('idx_user_screen_perm_user_id').on(table.user_id),
}));

