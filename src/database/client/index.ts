import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '../schema/index';
import { getAppPaths } from '../../main/config';

let dbInstance: BetterSQLite3Database<typeof schema> | null = null;
let sqliteClient: Database.Database | null = null;

export function initDatabase(): void {
  if (dbInstance) return;

  const { database } = getAppPaths();
  sqliteClient = new Database(database);
  
  sqliteClient.pragma('journal_mode = WAL');
  sqliteClient.pragma('foreign_keys = ON');
  sqliteClient.pragma('synchronous = NORMAL');

  dbInstance = drizzle(sqliteClient, { schema });
}

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (!dbInstance) {
    throw new Error('Database has not been initialized. Call initDatabase() first.');
  }
  return dbInstance;
}

export function getSqliteClient(): Database.Database {
  if (!sqliteClient) {
    initDatabase();
  }
  return sqliteClient!;
}

export function setDb(instance: BetterSQLite3Database<typeof schema> | null): void {
  dbInstance = instance;
}

export function setSqliteClient(client: Database.Database | null): void {
  sqliteClient = client;
}

export function closeDatabase(): void {
  if (sqliteClient) {
    sqliteClient.close();
    sqliteClient = null;
    dbInstance = null;
  }
}

export function reopenDatabase(customDbPath?: string): void {
  closeDatabase();
  const dbPath = customDbPath ?? getAppPaths().database;
  sqliteClient = new Database(dbPath);
  sqliteClient.pragma('journal_mode = WAL');
  sqliteClient.pragma('foreign_keys = ON');
  sqliteClient.pragma('synchronous = NORMAL');
  dbInstance = drizzle(sqliteClient, { schema });
}
