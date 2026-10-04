import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../src/database/schema/index';
import { setDb } from '../src/database/client/index';
import {
  createExpenseCategory,
  updateExpenseCategory,
  createExpense,
  listExpenses,
  getExpenseById,
  voidExpense,
} from '../src/repositories/expenses';
import {
  openCashSession,
  recordCashIn,
  recordCashOut,
  closeCashSession,
  listCashSessions,
  computeExpectedCash,
} from '../src/repositories/cash';
import { createSale } from '../src/repositories/sales';
import { createCategory, createUnit } from '../src/repositories/catalog';
import { createProduct } from '../src/repositories/products';
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

function assertThrows(fn: () => void, testName: string, expectedErrorPart?: string): void {
  try {
    fn();
    console.error(`  [FAIL] ${testName} — Expected error was not thrown`);
    failed++;
  } catch (error: any) {
    if (expectedErrorPart && !error.message.includes(expectedErrorPart)) {
      console.error(`  [FAIL] ${testName} — Expected error containing "${expectedErrorPart}" but got "${error.message}"`);
      failed++;
    } else {
      console.log(`  [PASS] ${testName}`);
      passed++;
    }
  }
}

function setup(): void {
  const tempDir = path.join(process.env.TEMP || process.env.TMP || '/tmp');
  dbPath = path.join(tempDir, `martpos-phase11-${Date.now()}.db`);
  rawDb = new Database(dbPath);
  rawDb.pragma('journal_mode = WAL');
  rawDb.pragma('foreign_keys = ON');
  const db = drizzle(rawDb, { schema });
  setDb(db);
  migrate(db, { migrationsFolder: path.join(process.cwd(), 'src', 'database', 'migrations') });
  
  // Create admin user for foreign key satisfaction
  ensureDefaultAdmin();

  // Set active user session for audit logs
  setActiveSession({ id: 1, username: 'admin', full_name: 'Administrator', role: 'admin', is_active: true, created_at: '', updated_at: '' }, 'test-session-123');
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
  console.log('=== Phase 11 Expenses & Cash Management Tests ===');
  setup();
  try {
    // 1. EXPENSES
    console.log('\n--- Expenses Module ---');
    const cat = createExpenseCategory({ name: 'Utilities', description: 'Electric & Water' });
    assert(cat.id > 0 && cat.name === 'Utilities', 'Category created successfully');
    
    assertThrows(() => createExpenseCategory({ name: 'Utilities' }), 'Duplicate category rejection');
    
    const updatedCat = updateExpenseCategory({ id: cat.id, name: 'Utilities & Bills', is_active: false });
    assert(updatedCat.name === 'Utilities & Bills' && updatedCat.is_active === false, 'Category updated and deactivated');
    
    updateExpenseCategory({ id: cat.id, is_active: true }); // Re-activate for tests
    
    // Non-cash expense
    const exp1 = createExpense({ category_id: cat.id, amount_minor: 500000, payment_method: 'bank_transfer', description: 'Electric Bill' });
    assert(exp1.expense_number.startsWith('EXP-'), 'Expense created with sequence number');
    assert(exp1.amount_minor === 500000, 'Decimal money conversion handled correctly (minor units)');
    
    const expList = listExpenses({ category_id: cat.id });
    assert(expList.length === 1 && expList[0]?.id === exp1.id, 'Expense listing & filtering');
    
    const details = getExpenseById(exp1.id);
    assert(details.category_name === 'Utilities & Bills' && details.payment_method === 'bank_transfer', 'Expense details lookup');
    
    // 2. CASH MANAGEMENT
    console.log('\n--- Cash Management Module ---');
    const session = openCashSession({ opening_cash_minor: 100000 });
    assert(session.id > 0 && session.status === 'OPEN', 'Cash session opened');
    
    assertThrows(() => openCashSession({ opening_cash_minor: 50000 }), 'Duplicate active session rejected');
    
    recordCashIn({ session_id: session.id, amount_minor: 200000, description: 'Added float' });
    recordCashOut({ session_id: session.id, amount_minor: 50000, description: 'Petty cash' });
    
    const expectedBeforeSale = computeExpectedCash(session.id);
    assert(expectedBeforeSale === (100000 + 200000 - 50000), `Opening balance + Cash In - Cash Out expected cash = ${expectedBeforeSale}`);
    
    // 3. INTEGRATION (Sales -> Cash)
    console.log('\n--- Integration: Sales & Expenses with Cash ---');
    
    const catalogCat = createCategory({ name: 'Snacks' });
    const unit = createUnit({ name: 'Piece', abbreviation: 'pc', decimals: 0 });
    const product = createProduct({
      name: 'Chips',
      category_id: catalogCat.id,
      variants: [{ variant_name: 'Regular', unit_id: unit.id, purchase_price_minor: 5000, selling_price_minor: 10000, sku: 'CHIP-01', min_stock_alert: 10 }],
    });
    const variantId = product.variants![0]!.id;
    
    // Cash Sale (Should increase expected cash by 10000)
    createSale({
      items: [{ variant_id: variantId, quantity: 1000, discount_minor: 0 }],
      payments: [{ payment_method: 'cash', amount_minor: 10000 }],
      discount_minor: 0
    });
    
    let expectedAfterSale = computeExpectedCash(session.id);
    assert(expectedAfterSale === expectedBeforeSale + 10000, 'Cash sale integration correctly affects physical cash (added 10000)');
    
    // Non-cash Sale (Should NOT increase expected cash)
    createSale({
      items: [{ variant_id: variantId, quantity: 1000, discount_minor: 0 }],
      payments: [{ payment_method: 'card', amount_minor: 10000 }],
      discount_minor: 0
    });
    assert(computeExpectedCash(session.id) === expectedAfterSale, 'Non-cash sale does not affect physical cash');
    
    // Cash Expense (Should decrease expected cash by 20000)
    const expCash = createExpense({ category_id: cat.id, amount_minor: 20000, payment_method: 'cash', description: 'Store supplies' });
    let expectedAfterExpense = computeExpectedCash(session.id);
    assert(expectedAfterExpense === expectedAfterSale - 20000, 'Cash expense integration correctly affects physical cash');
    
    // Voiding cash expense
    voidExpense(expCash.id);
    assert(computeExpectedCash(session.id) === expectedAfterSale, 'Voiding cash expense restores physical cash (CASH_IN movement added)');
    
    // 4. CLOSING
    console.log('\n--- Session Close ---');
    const finalExpected = computeExpectedCash(session.id);
    const closed = closeCashSession({ session_id: session.id, actual_cash_minor: finalExpected - 1000, notes: 'Missing 10rs' });
    
    assert(closed.status === 'CLOSED', 'Session successfully closed');
    assert(closed.expected_cash_minor === finalExpected, 'Session expected balance recorded securely');
    assert(closed.variance_minor === -1000, 'Session variance calculated securely');
    
    const history = listCashSessions();
    assert(history.length === 1 && history[0]!.id === session.id, 'Session history available');
    
    // 5. AUDIT LOGS
    console.log('\n--- Audit Trail ---');
    const logs = listAuditLogs({ limit: 100 });
    const logEvents = logs.map((l: any) => l.event_type);
    assert(logEvents.includes('EXPENSE_CATEGORY_CREATE'), 'Expense category audit event exists');
    assert(logEvents.includes('EXPENSE_CREATE'), 'Expense create audit event exists');
    assert(logEvents.includes('EXPENSE_VOID'), 'Expense void audit event exists');
    assert(logEvents.includes('CASH_SESSION_OPEN'), 'Cash session open audit event exists');
    assert(logEvents.includes('CASH_IN'), 'Cash In audit event exists');
    assert(logEvents.includes('CASH_OUT'), 'Cash Out audit event exists');
    assert(logEvents.includes('CASH_SESSION_CLOSE'), 'Cash session close audit event exists');

  } finally {
    cleanup();
  }

  console.log(`\nSummary: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

run();
