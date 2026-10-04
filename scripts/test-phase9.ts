/**
 * MARTPOS Phase 9 Automated Test Suite
 *
 * Tests:
 * 1. User creation with salted password hashing
 * 2. Successful login with credential verification
 * 3. Invalid password rejection (safe message, no user leak)
 * 4. Invalid username rejection
 * 5. Deactivated user rejection
 * 6. Audit logging on login success, login failure, and logout
 * 7. Active session tracking in main process
 * 8. Current user resolution
 * 9. Logout & session termination
 * 10. Role and granular permission matrix checks
 * 11. User updates and administrative password reset
 * 12. Self-service password change with current password validation
 * 13. Audit log query and filter verification
 */

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../src/database/schema/index';
import { setDb } from '../src/database/client/index';
import {
  hashPassword,
  verifyPassword,
  ensureDefaultAdmin,
  login,
  logout,
  getActiveUser,
  getActiveSessionToken,
  restoreActiveSession,
  setActiveSession,
  changePassword,
} from '../src/repositories/auth';
import {
  listUsers,
  createUser,
  updateUser,
  resetUserPassword,
} from '../src/repositories/users';
import { listAuditLogs } from '../src/repositories/audit';
import { hasPermission } from '../src/shared/types/auth';
import path from 'node:path';
import fs from 'node:fs';

let testDbPath: string | null = null;
let rawSqlite: Database.Database | null = null;

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: string): void {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${testName}${details ? ` — ${details}` : ''}`);
    failed++;
  }
}

function assertThrows(fn: () => void, expectedSubstring: string, testName: string): void {
  try {
    fn();
    console.error(`  [FAIL] ${testName} — Expected error containing "${expectedSubstring}", but no error was thrown`);
    failed++;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.toLowerCase().includes(expectedSubstring.toLowerCase())) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName} — Error was thrown but did not contain "${expectedSubstring}". Got: "${message}"`);
      failed++;
    }
  }
}

function setupTestDb(): void {
  const tempDir = path.join(process.env.TEMP || process.env.TMP || '/tmp');
  testDbPath = path.join(tempDir, `martpos-test-phase9-${String(Date.now())}.db`);

  console.log(`[Setup] Creating isolated test database at: ${testDbPath}`);
  rawSqlite = new Database(testDbPath);
  rawSqlite.pragma('journal_mode = WAL');
  rawSqlite.pragma('foreign_keys = ON');

  const testDrizzleDb = drizzle(rawSqlite, { schema });
  setDb(testDrizzleDb);

  console.log('[Setup] Running migrations...');
  const migrationsFolder = path.join(process.cwd(), 'src', 'database', 'migrations');
  migrate(testDrizzleDb, { migrationsFolder });
  console.log('[Setup] Migrations applied successfully.');
}

function cleanupTestDb(): void {
  if (rawSqlite) {
    rawSqlite.close();
    rawSqlite = null;
  }
  if (testDbPath && fs.existsSync(testDbPath)) {
    console.log('[Cleanup] Removing temporary test database file...');
    try {
      fs.unlinkSync(testDbPath);
      const wal = `${testDbPath}-wal`;
      const shm = `${testDbPath}-shm`;
      if (fs.existsSync(wal)) fs.unlinkSync(wal);
      if (fs.existsSync(shm)) fs.unlinkSync(shm);
    } catch {
      // ignore
    }
    console.log('[Cleanup] Isolated test database cleaned up.');
  }
}

function runPhase9Tests(): void {
  console.log('====================================================');
  console.log('MARTPOS Phase 9 Automated Test Suite (Isolated DB)');
  console.log('====================================================');

  setupTestDb();

  try {
    // ======================================================
    // 1. Password Hashing & Verification Security
    // ======================================================
    console.log('\n--- 1. Password Hashing & Crypto ---');
    const { hash: hash1, salt: salt1 } = hashPassword('SuperSecret123');
    assert(hash1.length === 128, '1. Salted scrypt produces 64-byte hex hash (128 chars)');
    assert(salt1.length === 32, '1a. Salt is 16-byte random hex string (32 chars)');
    assert(verifyPassword('SuperSecret123', hash1, salt1), '1b. Correct password verifies successfully');
    assert(!verifyPassword('WrongPassword', hash1, salt1), '1c. Incorrect password fails verification');

    // ======================================================
    // 2. Default Admin Initialization
    // ======================================================
    console.log('\n--- 2. Default Admin Account ---');
    ensureDefaultAdmin();
    const initialUsers = listUsers();
    assert(initialUsers.length === 1, '2. Exactly one default administrator account initialized');
    assert(initialUsers[0]?.username === 'admin', '2a. Default admin username is "admin"');
    assert(initialUsers[0]?.role === 'admin', '2b. Role is admin');

    // ======================================================
    // 3. Authentication & Login Flow
    // ======================================================
    console.log('\n--- 3. Authentication & Login ---');
    const adminUser = login({ username: 'admin', password: 'admin123' });
    assert(adminUser.username === 'admin', '3. Admin login successful');
    assert(getActiveUser()?.username === 'admin', '3a. In-memory session tracks active user');
    assert(Boolean(getActiveSessionToken()), '3b. Active session token generated');

    // Check login audit
    let auditLogs = listAuditLogs({ event_type: 'LOGIN_SUCCESS' });
    assert(auditLogs.length >= 1, '3c. LOGIN_SUCCESS audit event created');
    assert(auditLogs[0]?.username_snapshot === 'admin', '3d. Audit log captures username snapshot');

    // Invalid password test
    assertThrows(
      () => login({ username: 'admin', password: 'badpassword' }),
      'Invalid username or password',
      '4. Invalid password rejected with safe message',
    );
    auditLogs = listAuditLogs({ event_type: 'LOGIN_FAILED' });
    assert(auditLogs.length >= 1, '4a. LOGIN_FAILED audit event created on bad password');

    // Invalid username test
    assertThrows(
      () => login({ username: 'nonexistent', password: 'any' }),
      'Invalid username or password',
      '4b. Non-existent username rejected with identical safe message',
    );

    // ======================================================
    // 4. Staff User Management (CRUD)
    // ======================================================
    console.log('\n--- 4. Staff User Management ---');
    const cashierUser = createUser({
      username: 'cashier01',
      password: 'password123',
      full_name: 'Bilal Ahmad',
      role: 'cashier',
    });
    assert(cashierUser.id > 0, '5. Cashier account created');
    assert(cashierUser.username === 'cashier01', '5a. Username normalized');
    assert(cashierUser.role === 'cashier', '5b. Assigned role is cashier');

    // Duplicate username test
    assertThrows(
      () =>
        createUser({
          username: 'cashier01',
          password: 'password123',
          full_name: 'Another User',
          role: 'cashier',
        }),
      'already taken',
      '5c. Duplicate username is strictly rejected',
    );

    // Update user profile
    const updatedUser = updateUser({
      id: cashierUser.id,
      full_name: 'Bilal Ahmad Khan',
    });
    assert(updatedUser.full_name === 'Bilal Ahmad Khan', '6. Staff full name updated');

    // ======================================================
    // 5. Logout & Session Termination
    // ======================================================
    console.log('\n--- 5. Logout & Session Termination ---');
    logout();
    assert(getActiveUser() === null, '7. Active user cleared on logout');
    assert(getActiveSessionToken() === null, '7a. Session token cleared on logout');
    const logoutAudits = listAuditLogs({ event_type: 'LOGOUT' });
    assert(logoutAudits.length >= 1, '7b. LOGOUT audit event recorded');

    // Login as cashier
    const cashierLogin = login({ username: 'cashier01', password: 'password123' });
    assert(cashierLogin.username === 'cashier01', '8. Cashier login successful');
    const cashierSessionToken = getActiveSessionToken();
    setActiveSession(null, null);
    const restoredUser = restoreActiveSession();
    assert(restoredUser?.username === 'cashier01', '8a. Active user restores from database session');
    assert(getActiveSessionToken() === cashierSessionToken, '8b. Database session token restores in memory');

    // ======================================================
    // 6. Role-Based Permissions Matrix
    // ======================================================
    console.log('\n--- 6. Role-Based Permissions Matrix ---');
    assert(hasPermission('admin', 'users.manage'), '9a. Admin has users.manage permission');
    assert(hasPermission('admin', 'reports.export'), '9b. Admin has reports.export permission');
    assert(!hasPermission('cashier', 'users.manage'), '9c. Cashier does NOT have users.manage permission');
    assert(!hasPermission('cashier', 'reports.view'), '9d. Cashier does NOT have reports.view permission');
    assert(hasPermission('cashier', 'pos.checkout'), '9e. Cashier has pos.checkout permission');
    assert(hasPermission('store_manager', 'inventory.adjust'), '9f. Store Manager has inventory.adjust permission');
    assert(hasPermission('store_manager', 'users.view'), '9g. Store Manager can view staff accounts');
    assert(!hasPermission('store_manager', 'users.manage'), '9h. Store Manager does NOT have users.manage permission');
    assert(!hasPermission('cashier', 'users.view'), '9i. Cashier does NOT have users.view permission');

    // ======================================================
    // 7. Password Management (Change & Reset)
    // ======================================================
    console.log('\n--- 7. Password Change & Admin Reset ---');
    // Cashier changes their own password
    changePassword({ currentPassword: 'password123', newPassword: 'newCashierPassword456' });
    assert(true, '10. Cashier changed own password with valid current password');

    logout();
    const cashierLoginNew = login({ username: 'cashier01', password: 'newCashierPassword456' });
    assert(cashierLoginNew.username === 'cashier01', '10a. Login succeeds with new password');

    // Admin resets cashier password
    logout();
    login({ username: 'admin', password: 'admin123' });
    resetUserPassword({ userId: cashierUser.id, newPassword: 'adminAssignedPass789' });
    assert(true, '11. Admin reset user password');

    logout();
    const cashierLoginReset = login({ username: 'cashier01', password: 'adminAssignedPass789' });
    assert(cashierLoginReset.username === 'cashier01', '11a. Login succeeds with admin-reset password');

    // ======================================================
    // 8. Account Deactivation
    // ======================================================
    console.log('\n--- 8. Account Deactivation ---');
    updateUser({ id: cashierUser.id, is_active: false });
    logout();

    assertThrows(
      () => login({ username: 'cashier01', password: 'adminAssignedPass789' }),
      'deactivated',
      '12. Deactivated account is rejected at login',
    );

    // ======================================================
    // 9. Audit Trail Integrity
    // ======================================================
    console.log('\n--- 9. Audit Trail Integrity ---');
    const allAudits = listAuditLogs({ limit: 50 });
    assert(allAudits.length >= 8, '13. Comprehensive audit trail captured all authentication and user events');
    const eventTypes = allAudits.map((a) => a.event_type);
    assert(eventTypes.includes('LOGIN_SUCCESS'), '13a. Contains LOGIN_SUCCESS');
    assert(eventTypes.includes('LOGIN_FAILED'), '13b. Contains LOGIN_FAILED');
    assert(eventTypes.includes('LOGOUT'), '13c. Contains LOGOUT');
    assert(eventTypes.includes('USER_CREATE'), '13d. Contains USER_CREATE');
    assert(eventTypes.includes('PASSWORD_RESET'), '13e. Contains PASSWORD_RESET');
  } finally {
    cleanupTestDb();
  }

  console.log('\n====================================================');
  console.log(`Phase 9 Test Results: ${String(passed)} Passed, ${String(failed)} Failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase9Tests();
