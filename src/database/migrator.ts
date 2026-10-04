import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { getDb } from './client/index';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';
import { logger } from '@main/logger';

export function getMigrationsFolder(): string {
  const candidates = app.isPackaged
    ? [
        join(process.resourcesPath, 'migrations'),
        join(process.resourcesPath, 'app.asar', 'src', 'database', 'migrations'),
      ]
    : [join(app.getAppPath(), 'src', 'database', 'migrations')];

  const migrationsFolder = candidates.find((candidate) => existsSync(join(candidate, 'meta', '_journal.json')));
  if (!migrationsFolder) {
    throw new Error(`Drizzle migrations directory not found. Checked: ${candidates.join(', ')}`);
  }

  return migrationsFolder;
}

export function runMigrations(): void {
  const db = getDb();
  const migrationsFolder = getMigrationsFolder();

  logger.info('database', `Running migrations from: ${migrationsFolder}`);
  
  try {
    migrate(db, { migrationsFolder });
    logger.info('database', 'Migrations completed successfully.');
  } catch (error) {
    logger.error('database', 'Failed to run migrations', error);
    throw error;
  }
}
