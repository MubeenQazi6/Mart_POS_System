import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { getDb } from './client/index';
import { join } from 'node:path';
import { app } from 'electron';
import { logger } from '@main/logger';

export function runMigrations(): void {
  const db = getDb();
  
  const migrationsFolder = app.isPackaged
    ? join(process.resourcesPath, 'app.asar', 'src', 'database', 'migrations')
    : join(app.getAppPath(), 'src', 'database', 'migrations');

  logger.info('database', `Running migrations from: ${migrationsFolder}`);
  
  try {
    migrate(db, { migrationsFolder });
    logger.info('database', 'Migrations completed successfully.');
  } catch (error) {
    logger.error('database', 'Failed to run migrations', error);
    throw error;
  }
}
