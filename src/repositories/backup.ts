import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { getAppPaths } from '../main/config';
import { getSqliteClient, reopenDatabase, getDb } from '../database/client/index';
import { logAuditEvent } from './audit';
import { getSetting } from './settings';
import type { BackupMetadata, BackupValidationResult, RestoreResult, DatabaseStats } from '@shared/types/backup';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { getMigrationsFolder } from '../database/migrator';

const REQUIRED_TABLES = [
  'settings',
  'users',
  'categories',
  'brands',
  'units',
  'products',
  'product_variants',
  'product_barcodes',
  'stock_movements',
  'sales',
  'sale_items',
  'sale_payments',
  'customers',
  'customer_transactions',
  'suppliers',
  'supplier_transactions',
  'purchases',
  'purchase_items',
  'expenses',
  'expense_categories',
  'cash_sessions',
  'cash_movements',
  'returns',
  'return_items',
  'audit_logs',
  'notifications',
];

function ensureDirectory(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function countRecordsInDatabase(client: Database.Database): { tablesCount: number; recordsCount: number } {
  try {
    const tableRows = client
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle%'")
      .all() as Array<{ name: string }>;

    let totalRecords = 0;
    for (const row of tableRows) {
      try {
        const countRow = client.prepare(`SELECT COUNT(*) as count FROM "${row.name}"`).get() as { count: number };
        totalRecords += countRow?.count ?? 0;
      } catch {
        // Continue if table locked or temporary
      }
    }

    return {
      tablesCount: tableRows.length,
      recordsCount: totalRecords,
    };
  } catch {
    return { tablesCount: 0, recordsCount: 0 };
  }
}

export async function createBackup(notes?: string, isSafety = false): Promise<BackupMetadata> {
  const { backups } = getAppPaths();
  ensureDirectory(backups);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupId = `backup-${Date.now()}`;
  const prefix = isSafety ? 'pre-restore-safety' : 'kingsmart-backup';
  const filename = `${prefix}-${timestamp}.db`;
  const targetPath = path.join(backups, filename);
  const metaPath = path.join(backups, `${filename}.json`);

  const client = getSqliteClient();

  // Perform transactionally consistent WAL backup
  await client.backup(targetPath);

  // Read stats from the newly created backup file
  const backupDb = new Database(targetPath, { readonly: true });
  const { tablesCount, recordsCount } = countRecordsInDatabase(backupDb);
  backupDb.close();

  const storeName = getSetting('store.name') || 'Kings Mart';
  const stat = fs.statSync(targetPath);

  const metadata: BackupMetadata = {
    id: backupId,
    app_name: 'Kings Mart',
    app_version: '0.1.0',
    database_version: '1.0',
    created_at: new Date().toISOString(),
    store_name: storeName,
    filename,
    file_path: targetPath,
    size_bytes: stat.size,
    tables_count: tablesCount,
    records_count: recordsCount,
    is_automatic_safety: isSafety,
  };

  // Save JSON sidecar
  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf-8');

  logAuditEvent({
    event_type: 'BACKUP_CREATED',
    status: 'SUCCESS',
    details: `${isSafety ? 'Safety snapshot' : 'Backup'} created: ${filename} (${String(tablesCount)} tables, ${String(recordsCount)} records)${notes ? ` - ${notes}` : ''}`,
  });

  return metadata;
}

export function listBackups(): BackupMetadata[] {
  const { backups } = getAppPaths();
  ensureDirectory(backups);

  const files = fs.readdirSync(backups);
  const dbFiles = files.filter((f) => f.endsWith('.db'));
  const results: BackupMetadata[] = [];

  for (const filename of dbFiles) {
    const filePath = path.join(backups, filename);
    const metaPath = path.join(backups, `${filename}.json`);

    if (fs.existsSync(metaPath)) {
      try {
        const raw = fs.readFileSync(metaPath, 'utf-8');
        const parsed = JSON.parse(raw) as BackupMetadata;
        parsed.file_path = filePath;
        results.push(parsed);
        continue;
      } catch {
        // Fall back to inspect DB directly
      }
    }

    // Direct inspect fallback
    try {
      const stat = fs.statSync(filePath);
      const tempDb = new Database(filePath, { readonly: true });
      const { tablesCount, recordsCount } = countRecordsInDatabase(tempDb);
      tempDb.close();

      results.push({
        id: `backup-${String(stat.mtimeMs)}`,
        app_name: 'Kings Mart',
        app_version: '0.1.0',
        database_version: '1.0',
        created_at: stat.mtime.toISOString(),
        store_name: 'Kings Mart',
        filename,
        file_path: filePath,
        size_bytes: stat.size,
        tables_count: tablesCount,
        records_count: recordsCount,
        is_automatic_safety: filename.startsWith('pre-restore'),
      });
    } catch {
      // Ignore unreadable files
    }
  }

  // Sort newest first
  results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return results;
}

export function getDatabaseStats(): DatabaseStats {
  const { database, backups } = getAppPaths();
  ensureDirectory(backups);

  let sizeBytes = 0;
  if (fs.existsSync(database)) {
    try {
      sizeBytes = fs.statSync(database).size;
    } catch {
      sizeBytes = 0;
    }
  }

  const client = getSqliteClient();
  const { tablesCount, recordsCount } = countRecordsInDatabase(client);
  const backupsList = listBackups();
  const lastBackup = backupsList.length > 0 ? backupsList[0] : null;

  return {
    size_bytes: sizeBytes,
    tables_count: tablesCount,
    total_records: recordsCount,
    last_backup: lastBackup,
    database_path: database,
    backups_directory: backups,
  };
}

export function validateBackup(filePath: string): BackupValidationResult {
  if (!fs.existsSync(filePath)) {
    return {
      is_valid: false,
      error: 'Backup file does not exist at specified path',
      tables_found: [],
      missing_required_tables: REQUIRED_TABLES,
      integrity_check_passed: false,
      foreign_keys_valid: false,
    };
  }

  let db: Database.Database | null = null;
  try {
    db = new Database(filePath, { readonly: true });

    // 1. Integrity check
    const integrityRow = db.pragma('integrity_check') as Array<{ integrity_check?: string }> | undefined;
    const firstIntegrity = integrityRow && integrityRow.length > 0 ? integrityRow[0] : undefined;
    const integrityPassed = firstIntegrity?.integrity_check === 'ok';

    if (!integrityPassed) {
      return {
        is_valid: false,
        error: 'Database file failed SQLite integrity check (corrupted database)',
        tables_found: [],
        missing_required_tables: REQUIRED_TABLES,
        integrity_check_passed: false,
        foreign_keys_valid: false,
      };
    }

    // 2. Foreign key check
    const fkErrors = db.pragma('foreign_key_check') as any[];
    const foreignKeysValid = fkErrors.length === 0;

    // 3. Check existing tables
    const tableRows = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all() as Array<{ name: string }>;
    const tablesFound = tableRows.map((r) => r.name);

    // Required core tables check
    const essentialTables = ['settings', 'users', 'products', 'sales', 'stock_movements', 'customers'];
    const missing = REQUIRED_TABLES.filter((req) => !tablesFound.includes(req));
    const missingEssential = essentialTables.filter((req) => !tablesFound.includes(req));

    if (missingEssential.length > 0) {
      return {
        is_valid: false,
        error: `Incompatible backup: missing essential business tables (${missingEssential.join(', ')})`,
        tables_found: tablesFound,
        missing_required_tables: missing,
        integrity_check_passed: integrityPassed,
        foreign_keys_valid: foreignKeysValid,
      };
    }

    // Read metadata if sidecar exists
    let metadata: BackupMetadata | undefined;
    const metaPath = `${filePath}.json`;
    if (fs.existsSync(metaPath)) {
      try {
        metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      } catch {
        // sidecar optional
      }
    }

    return {
      is_valid: true,
      metadata,
      tables_found: tablesFound,
      missing_required_tables: missing,
      integrity_check_passed: integrityPassed,
      foreign_keys_valid: foreignKeysValid,
    };
  } catch (error) {
    return {
      is_valid: false,
      error: error instanceof Error ? error.message : 'Failed to inspect SQLite database',
      tables_found: [],
      missing_required_tables: REQUIRED_TABLES,
      integrity_check_passed: false,
      foreign_keys_valid: false,
    };
  } finally {
    if (db) {
      try {
        db.close();
      } catch {
        // ignore
      }
    }
  }
}

export async function restoreBackup(backupFilePath: string): Promise<RestoreResult> {
  const validation = validateBackup(backupFilePath);
  if (!validation.is_valid) {
    throw new Error(validation.error || 'Backup validation failed');
  }

  const { database } = getAppPaths();
  logAuditEvent({
    event_type: 'BACKUP_RESTORE_STARTED',
    status: 'SUCCESS',
    details: `Initiating restore from backup file: ${path.basename(backupFilePath)}`,
  });

  // 1. Create automatic pre-restore safety backup
  let safetyBackup: BackupMetadata | null = null;
  try {
    safetyBackup = await createBackup('Automatic pre-restore safety snapshot', true);
  } catch (safetyErr) {
    logAuditEvent({
      event_type: 'BACKUP_RESTORE_FAILED',
      status: 'FAILED',
      details: `Pre-restore safety backup failed: ${safetyErr instanceof Error ? safetyErr.message : 'Unknown error'}`,
    });
    throw new Error(`Failed to create pre-restore safety snapshot: ${safetyErr instanceof Error ? safetyErr.message : 'Unknown error'}`);
  }

  // 2. Perform atomic restore replacement
  const walFile = `${database}-wal`;
  const shmFile = `${database}-shm`;

  try {
    // Close active DB
    reopenDatabase(); // Ensure clean state
    const currentClient = getSqliteClient();
    currentClient.close();

    // Remove WAL & SHM to prevent dirty WAL merge
    if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
    if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);

    // Atomically copy backup into active DB path
    fs.copyFileSync(backupFilePath, database);

    // Reopen DB connection
    reopenDatabase();

    // Apply any migrations if needed to ensure schema alignment
    const db = getDb();
    migrate(db, { migrationsFolder: getMigrationsFolder() });

    // Verify restored database integrity
    const testClient = getSqliteClient();
    const check = testClient.pragma('integrity_check') as Array<{ integrity_check?: string }> | undefined;
    const firstCheck = check && check.length > 0 ? check[0] : undefined;
    if (!firstCheck || firstCheck.integrity_check !== 'ok') {
      throw new Error('Restored database failed integrity verification');
    }

    const { tablesCount } = countRecordsInDatabase(testClient);

    logAuditEvent({
      event_type: 'BACKUP_RESTORE_COMPLETED',
      status: 'SUCCESS',
      details: `Successfully restored database from ${path.basename(backupFilePath)} with ${String(tablesCount)} tables`,
    });

    return {
      success: true,
      pre_restore_backup_path: safetyBackup.file_path,
      restored_tables_count: tablesCount,
      restored_at: new Date().toISOString(),
    };
  } catch (restoreErr) {
    // Roll back to safety snapshot
    if (safetyBackup && fs.existsSync(safetyBackup.file_path)) {
      try {
        if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
        if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);
        fs.copyFileSync(safetyBackup.file_path, database);
        reopenDatabase();
      } catch {
        // Rollback attempt
      }
    }

    logAuditEvent({
      event_type: 'BACKUP_RESTORE_FAILED',
      status: 'FAILED',
      details: `Restore failed and was rolled back: ${restoreErr instanceof Error ? restoreErr.message : 'Unknown error'}`,
    });

    throw new Error(`Database restore failed: ${restoreErr instanceof Error ? restoreErr.message : 'Unknown error'}`);
  }
}
