import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../src/database/schema/index';
import { setDb, setSqliteClient } from '../src/database/client/index';
import {
  getAllSettings,
  getSetting,
  setSetting,
  setManySettings,
  seedDefaultSettingsIfEmpty,
} from '../src/repositories/settings';
import {
  listNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  dismissNotification,
  generateSystemNotifications,
} from '../src/repositories/notifications';
import {
  createBackup,
  getDatabaseStats,
  restoreBackup,
} from '../src/repositories/backup';
import { listAuditLogs } from '../src/repositories/audit';
import { setActiveSession, ensureDefaultAdmin } from '../src/repositories/auth';
import path from 'node:path';
import fs from 'node:fs';

let testDir: string | null = null;
let dbPath: string | null = null;
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
  testDir = path.join(tempDir, `martpos-test-p14-15-${Date.now()}`);
  fs.mkdirSync(testDir, { recursive: true });

  dbPath = path.join(testDir, 'martpos.db');
  const backupsDir = path.join(testDir, 'backups');
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
  console.log('=== Phase 14 (Settings & Notifications) + Phase 15 (Backup & Restore) Tests ===');
  setup();

  try {
    // --- PART 1: KINGS MART BRANDING & SETTINGS ---
    console.log('\n--- 1. Settings & Kings Mart Branding ---');
    seedDefaultSettingsIfEmpty();
    const defaults = getAllSettings();
    assert(defaults['store.name'] === 'Kings Mart', 'Default store name is Kings Mart');
    assert(defaults['store.email'] === 'info@kingsmart.local', 'Default email is info@kingsmart.local');
    assert(defaults['pos.receipt_paper_size'] === '80mm', 'Default thermal paper is 80mm');
    assert(defaults['pos.allow_negative_stock'] === true, 'Default allow negative stock is true');

    // Batch update multiple settings
    setManySettings({
      'store.name': 'Kings Mart Flagship',
      'store.phone': '+92 312 3001579',
      'printing.receipt_printer_name': 'POS-80C',
      'security.session_timeout_minutes': 45,
    });

    assert(getSetting('store.name') === 'Kings Mart Flagship', 'Updated store name persisted');
    assert(getSetting('store.phone') === '+92 312 3001579', 'Updated phone persisted');
    assert(getSetting('printing.receipt_printer_name') === 'POS-80C', 'Printer name persisted');
    assert(getSetting('security.session_timeout_minutes') === 45, 'Session timeout persisted');

    // --- PART 2: NOTIFICATIONS ENGINE & DEDUPLICATION ---
    console.log('\n--- 2. Notifications & System Conditions ---');
    const generated = generateSystemNotifications();
    assert(Array.isArray(generated), 'System condition notifications generated');
    assert(generated.some((n) => n.id === 'cash-session-closed'), 'Missing cash session notification created');

    const unreadBefore = getUnreadNotificationCount();
    assert(unreadBefore > 0, 'Unread notification count is positive', `Got ${unreadBefore}`);

    // Mark as read
    markNotificationAsRead('cash-session-closed');
    const unreadAfterOne = getUnreadNotificationCount();
    assert(unreadAfterOne === unreadBefore - 1, 'Marking notification as read decrements count');

    // Mark all as read
    markAllNotificationsAsRead();
    assert(getUnreadNotificationCount() === 0, 'markAllNotificationsAsRead clears all unread');

    // Dismiss notification
    dismissNotification('cash-session-closed');
    const activeList = listNotifications();
    assert(!activeList.some((n) => n.id === 'cash-session-closed'), 'Dismissed notification is not returned in active list');

    // --- PART 3: BACKUP & RESTORE ---
    console.log('\n--- 3. Backup Creation & Verification ---');
    const backup = await createBackup('Nightly closing backup');
    assert(fs.existsSync(backup.file_path), 'Backup file exists');
    assert(backup.store_name === 'Kings Mart Flagship', 'Backup contains updated store name in metadata');
    assert(backup.tables_count >= 10, 'Backup table count is valid');

    // Verify BACKUP_CREATED audit event in active DB before restore
    const preRestoreLogs = listAuditLogs();
    assert(preRestoreLogs.some((l) => l.event_type === 'BACKUP_CREATED'), 'Audit trail contains BACKUP_CREATED');

    const stats = getDatabaseStats();
    assert(stats.tables_count > 0, 'Database stats tables count is non-zero');
    assert(stats.last_backup !== null, 'Database stats references last backup');

    console.log('\n--- 4. Restore & Data Integrity ---');
    // Change a setting to verify restore reverts it
    setSetting('store.name', 'Corrupted Store Name Before Restore');
    assert(getSetting('store.name') === 'Corrupted Store Name Before Restore', 'Active store name changed');

    // Perform restore
    const restoreResult = await restoreBackup(backup.file_path);
    assert(restoreResult.success === true, 'restoreBackup execution returned success');
    assert(getSetting('store.name') === 'Kings Mart Flagship', 'Restored database returned store name to Kings Mart Flagship');

    // --- PART 4: AUDIT LOG VERIFICATION ---
    console.log('\n--- 5. Audit Trail ---');
    const logs = listAuditLogs();
    const auditTypes = logs.map((l) => l.event_type);
    assert(auditTypes.includes('SETTINGS_UPDATE'), 'Audit trail contains SETTINGS_UPDATE');
    assert(auditTypes.includes('BACKUP_RESTORE_COMPLETED'), 'Audit trail contains BACKUP_RESTORE_COMPLETED');

    console.log(`\n====================================================`);
    console.log(`Phase 14 & 15 Test Results: ${passed} Passed, ${failed} Failed`);
    console.log(`====================================================`);
  } catch (error) {
    console.error('Test error:', error);
    failed++;
  } finally {
    cleanup();
  }

  if (failed > 0) {
    process.exit(1);
  }
}

void run();
