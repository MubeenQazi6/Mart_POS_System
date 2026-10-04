import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../src/database/schema/index';
import { setDb, setSqliteClient } from '../src/database/client/index';
import {
  createBackup,
  listBackups,
  validateBackup,
  restoreBackup,
} from '../src/repositories/backup';
import { listAuditLogs } from '../src/repositories/audit';
import { setActiveSession, ensureDefaultAdmin } from '../src/repositories/auth';
import { setSetting, getSetting } from '../src/repositories/settings';
import { createProduct } from '../src/repositories/products';
import { createCategory, createUnit } from '../src/repositories/catalog';
import path from 'node:path';
import fs from 'node:fs';

let testDir: string | null = null;
let dbPath: string | null = null;
let backupsDir: string | null = null;
let rawDb: Database.Database | null = null;
let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: string): void {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${String(testName)}${details ? ` — ${String(details)}` : ''}`);
    failed++;
  }
}

function setup(): void {
  const tempDir = path.join(process.env.TEMP || process.env.TMP || '/tmp');
  testDir = path.join(tempDir, `martpos-test-backup-${Date.now()}`);
  fs.mkdirSync(testDir, { recursive: true });

  dbPath = path.join(testDir, 'martpos.db');
  backupsDir = path.join(testDir, 'backups');
  fs.mkdirSync(backupsDir, { recursive: true });

  rawDb = new Database(dbPath);
  rawDb.pragma('journal_mode = WAL');
  rawDb.pragma('foreign_keys = ON');
  const db = drizzle(rawDb, { schema });
  setDb(db);
  setSqliteClient(rawDb);
  migrate(db, { migrationsFolder: path.join(process.cwd(), 'src', 'database', 'migrations') });

  ensureDefaultAdmin();
  setActiveSession(
    { id: 1, username: 'admin', full_name: 'Administrator', role: 'admin', is_active: true, created_at: '', updated_at: '' },
    'test-token',
  );
}

function cleanup(): void {
  if (rawDb) {
    try { rawDb.close(); } catch { /* ignore */ }
  }
  if (testDir && fs.existsSync(testDir)) {
    try { fs.rmSync(testDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

async function run(): Promise<void> {
  console.log('=== Backup & Safe Restore Automated Tests ===');
  setup();

  try {
    // 1. Seed initial data
    setSetting('store.name', 'Kings Mart Express');
    const category = createCategory({ name: 'Fresh Bakery' });
    const unit = createUnit({ name: 'Piece', abbreviation: 'pc', decimals: 0 });
    const product = createProduct({
      name: 'Whole Wheat Bread',
      category_id: category.id,
      variants: [
        { variant_name: 'Standard Loaf', sku: 'BREAD-01', selling_price_minor: 12000, purchase_price_minor: 9000, unit_id: unit.id },
      ],
    });
    assert(product.id > 0, 'Initial seeded product exists before backup');

    // 2. Create backup
    const backupMeta = await createBackup('Manual weekly backup');
    assert(fs.existsSync(backupMeta.file_path), 'Backup .db file created and exists');
    assert(backupMeta.tables_count >= 10, 'Backup contains all required business tables', `Got ${backupMeta.tables_count}`);
    assert(backupMeta.records_count > 0, 'Backup records count is non-zero');
    assert(backupMeta.store_name === 'Kings Mart Express', 'Store name captured in backup metadata');

    // Verify BACKUP_CREATED audit event in active DB
    const initialLogs = listAuditLogs();
    assert(initialLogs.some((l) => l.event_type === 'BACKUP_CREATED'), 'Audit log contains BACKUP_CREATED');

    // 3. List backups
    const list = listBackups();
    assert(list.length >= 1, 'listBackups returns generated backup');
    assert(list[0]?.filename === backupMeta.filename, 'Newest backup matches generated filename');

    // 4. Validate valid backup
    const validResult = validateBackup(backupMeta.file_path);
    assert(validResult.is_valid === true, 'validateBackup passes for intact SQLite database');
    assert(validResult.integrity_check_passed === true, 'SQLite integrity check returns true');
    assert(validResult.foreign_keys_valid === true, 'SQLite foreign keys check returns true');

    // 5. Test invalid backup rejection
    const corruptPath = path.join(testDir!, 'corrupt-backup.db');
    fs.writeFileSync(corruptPath, 'THIS_IS_NOT_A_VALID_SQLITE_DATABASE');
    const corruptResult = validateBackup(corruptPath);
    assert(corruptResult.is_valid === false, 'Corrupt non-SQLite file is strictly rejected');

    const nonExistentResult = validateBackup(path.join(testDir!, 'does-not-exist.db'));
    assert(nonExistentResult.is_valid === false, 'Non-existent path returns is_valid = false');

    // 6. Mutate active database to verify restore replaces it
    setSetting('store.name', 'Temporary Mutated Store');
    assert(getSetting('store.name') === 'Temporary Mutated Store', 'Active DB mutated');

    // 7. Perform Safe Restore
    const restoreRes = await restoreBackup(backupMeta.file_path);
    assert(restoreRes.success === true, 'restoreBackup succeeds');
    assert(restoreRes.pre_restore_backup_path !== undefined, 'Pre-restore safety snapshot was created');
    assert(fs.existsSync(restoreRes.pre_restore_backup_path!), 'Pre-restore safety snapshot file exists on disk');

    // 8. Verify restored state
    const restoredStoreName = getSetting('store.name');
    assert(restoredStoreName === 'Kings Mart Express', 'Restored store name matches original backup', `Got ${restoredStoreName}`);

    // 9. Verify Post-Restore Audit Trail Events
    const postLogs = listAuditLogs();
    const eventTypes = postLogs.map((l) => l.event_type);
    assert(eventTypes.includes('BACKUP_RESTORE_COMPLETED'), 'Audit log contains BACKUP_RESTORE_COMPLETED');

    console.log(`\nSummary: ${passed} passed, ${failed} failed`);
  } catch (error) {
    console.error('Test execution error:', error);
    failed++;
  } finally {
    cleanup();
  }

  if (failed > 0) {
    process.exit(1);
  }
}

void run();
