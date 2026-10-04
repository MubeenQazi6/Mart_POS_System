import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../src/database/schema/index';
import { setDb } from '../src/database/client/index';
import {
  getAllSettings,
  getSetting,
  setSetting,
  setManySettings,
  seedDefaultSettingsIfEmpty,
} from '../src/repositories/settings';
import { listAuditLogs } from '../src/repositories/audit';
import { setActiveSession, ensureDefaultAdmin } from '../src/repositories/auth';
import path from 'node:path';
import fs from 'node:fs';

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
  dbPath = path.join(tempDir, `martpos-test-settings-${Date.now()}.db`);
  rawDb = new Database(dbPath);
  rawDb.pragma('journal_mode = WAL');
  rawDb.pragma('foreign_keys = ON');
  const db = drizzle(rawDb, { schema });
  setDb(db);
  migrate(db, { migrationsFolder: path.join(process.cwd(), 'src', 'database', 'migrations') });

  ensureDefaultAdmin();
  setActiveSession({ id: 1, username: 'admin', full_name: 'Administrator', role: 'admin', is_active: true, created_at: '', updated_at: '' }, 'test-token');
}

function cleanup(): void {
  if (rawDb) rawDb.close();
  if (dbPath && fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  const wal = `${dbPath}-wal`;
  const shm = `${dbPath}-shm`;
  if (wal && fs.existsSync(wal)) fs.unlinkSync(wal);
  if (shm && fs.existsSync(shm)) fs.unlinkSync(shm);
}

function run(): void {
  console.log('=== Settings Module Automated Tests ===');
  setup();

  try {
    // 1. Initial defaults test
    const initial = getAllSettings();
    assert(initial['store.name'] === 'Kings Mart', 'Default store name is initialized');
    assert(initial['pos.allow_negative_stock'] === true, 'Default POS negative stock setting is true');
    assert(initial['pos.receipt_paper_size'] === '80mm', 'Default receipt paper size is 80mm');

    // 2. Set individual setting
    setSetting('store.name', 'Al-Karam Cash & Carry');
    const updatedName = getSetting('store.name');
    assert(updatedName === 'Al-Karam Cash & Carry', 'Setting store.name updated and retrieved');

    // 3. Set boolean and number types
    setSetting('pos.allow_negative_stock', false);
    assert(getSetting('pos.allow_negative_stock') === false, 'Boolean setting persisted accurately');

    setSetting('security.session_timeout_minutes', 120);
    assert(getSetting('security.session_timeout_minutes') === 120, 'Numeric setting persisted accurately');

    // 4. Batch update settings (setManySettings)
    setManySettings({
      'store.phone': '+92 321 9876543',
      'store.email': 'manager@alkaram.pk',
      'printing.receipt_printer_name': 'POS-80-USB',
      'printing.print_copies': 2,
    });

    const all = getAllSettings();
    assert(all['store.phone'] === '+92 321 9876543', 'Batch updated phone persisted');
    assert(all['store.email'] === 'manager@alkaram.pk', 'Batch updated email persisted');
    assert(all['printing.receipt_printer_name'] === 'POS-80-USB', 'Batch updated printer name persisted');
    assert(all['printing.print_copies'] === 2, 'Batch updated print copies persisted');

    // 5. Audit Log verification
    const logs = listAuditLogs();
    const settingsAudit = logs.find((l) => l.event_type === 'SETTINGS_UPDATE');
    assert(settingsAudit !== undefined, 'Settings update generates SETTINGS_UPDATE audit event');

    // 6. Persistence across table initialization
    seedDefaultSettingsIfEmpty();
    assert(getSetting('store.name') === 'Al-Karam Cash & Carry', 'Custom settings preserved and not overwritten by seedDefaultSettingsIfEmpty');

  } finally {
    cleanup();
  }

  console.log(`\nSummary: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

run();
