import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../src/database/schema/index';
import { setDb } from '../src/database/client/index';
import { getMachineFingerprint } from '../src/main/licensing/machine';
import {
  getSystemLicenseStatus,
  activateSystemLicense,
} from '../src/main/licensing/index';
import { generateSignedLicense } from '../license-generator-tool/generator';
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

function createFreshDb(): void {
  const tempDir = path.join(process.env.TEMP || process.env.TMP || '/tmp');
  dbPath = path.join(tempDir, `martpos-test-trial-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
  rawDb = new Database(dbPath);
  rawDb.pragma('journal_mode = WAL');
  rawDb.pragma('foreign_keys = ON');
  const db = drizzle(rawDb, { schema });
  setDb(db);
  migrate(db, { migrationsFolder: path.join(process.cwd(), 'src', 'database', 'migrations') });
}

function cleanupDb(): void {
  if (rawDb) rawDb.close();
  if (dbPath && fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
}

function run(): void {
  console.log('=== 3-Day Trial Persistence & Reinstallation Prevention Tests ===');

  const machineCode = getMachineFingerprint();

  // Test 1: First-time launch on machine
  createFreshDb();
  try {
    const status1 = getSystemLicenseStatus();
    assert(status1.status === 'TRIAL', 'First-time launch enters TRIAL status');
    assert(status1.is_active === true, 'First-time launch has is_active = true');
    assert(typeof status1.days_remaining === 'number' && status1.days_remaining >= 1, 'First-time launch has days remaining');

    // Test 2: User closes and reopens (simulated by re-calling getSystemLicenseStatus)
    const status2 = getSystemLicenseStatus();
    assert(status2.status === 'TRIAL', 'Close & Re-open preserves TRIAL status without locking');
    assert(status2.is_active === true, 'Close & Re-open keeps is_active = true');

    // Test 3: Reinstallation on same machine (new SQLite DB wiped/recreated)
    cleanupDb();
    createFreshDb(); // Fresh SQLite DB as if user uninstalled and reinstalled!

    const status3 = getSystemLicenseStatus();
    assert(status3.status === 'TRIAL', 'Reinstalled app detects machine trial without error');
    assert(status3.is_active === true, 'Reinstalled app within 3 days keeps trial active');

    // Test 4: Immediate activation on lock/trial screen
    const validLicense = generateSignedLicense({
      customerName: 'Trial Converter User',
      businessName: 'My Retail Shop',
      machineCode: machineCode,
      expiresMonths: 12,
    });

    const actRes = activateSystemLicense(validLicense.json);
    assert(actRes.success === true, 'License activation succeeds immediately');
    assert(actRes.status.is_active === true, 'License is active immediately upon activation');

    const status4 = getSystemLicenseStatus();
    assert(status4.status === 'VALID', 'Permanent license overrides trial immediately');
    assert(status4.is_active === true, 'Software permanently unlocked');
  } finally {
    cleanupDb();
  }

  console.log(`\nSummary: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

run();
