import { getDb } from '../database/client/index';
import { ExtractTablesWithRelations } from 'drizzle-orm';
import { SQLiteTransaction } from 'drizzle-orm/sqlite-core';
import * as schema from '../database/schema/index';
import { RunResult } from 'better-sqlite3';

export type Transaction = SQLiteTransaction<'sync', RunResult, typeof schema, ExtractTablesWithRelations<typeof schema>>;

export function withTransaction<T>(callback: (tx: Transaction) => T): T {
  const db = getDb();
  return db.transaction(callback);
}
