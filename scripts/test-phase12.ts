import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../src/database/schema/index';
import { setDb } from '../src/database/client/index';
import { createExpenseCategory, createExpense, getExpenseSummaryReport, listExpenses, updateExpenseCategory } from '../src/repositories/expenses';
import { openCashSession, addCashMovement, closeCashSession, getCashRegisterReport, getCurrentCashSession } from '../src/repositories/cash';
import { listAuditLogs } from '../src/repositories/audit';
import path from 'node:path';
import fs from 'node:fs';

let dbPath: string | null = null;
let rawDb: Database.Database | null = null;
let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: string): void {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passed += 1;
  } else {
    console.error(`  [FAIL] ${String(testName)}${details ? ` — ${String(details)}` : ''}`);
    failed += 1;
  }
}

function setup(): void {
  const tempDir = path.join(process.env.TEMP || process.env.TMP || '/tmp');
  dbPath = path.join(tempDir, `martpos-phase12-${Date.now()}.db`);
  rawDb = new Database(dbPath);
  rawDb.pragma('journal_mode = WAL');
  rawDb.pragma('foreign_keys = ON');
  const db = drizzle(rawDb, { schema });
  setDb(db);
  migrate(db, { migrationsFolder: path.join(process.cwd(), 'src', 'database', 'migrations') });
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
  console.log('=== Phase 12 Expense and Cash tests ===');
  setup();
  try {
    const session = openCashSession({ opening_cash_minor: 500000, business_date: '2026-01-15' });
    const category = createExpenseCategory({ name: 'Utilities', description: 'Monthly operations' });
    const expense = createExpense({
      category_id: category.id,
      amount_minor: 250000,
      payment_method: 'cash',
      description: 'Electricity bill',
      expense_date: '2026-01-15',
    });

    assert(expense.id > 0, 'Expense row is created with an authoritative number');
    assert(expense.expense_number.startsWith('EXP-'), 'Expense numbers are generated in sequence');

    const listed = listExpenses({ category_id: category.id, limit: 10 });
    assert(listed.length >= 1, 'Expense listing includes the created expense');

    const summary = getExpenseSummaryReport({ category_id: category.id });
    assert(summary.total_expenses_minor === 250000, 'Expense summary totals are aggregated correctly');
    assert(summary.by_category.some((row) => row.category === 'Utilities'), 'Expense summary groups by category');

    const renamedCategory = updateExpenseCategory({ id: category.id, name: 'Utilities & Bills' });
    assert(renamedCategory.name === 'Utilities & Bills', 'Expense category can be edited');
    const inactiveCategory = updateExpenseCategory({ id: category.id, is_active: false });
    assert(!inactiveCategory.is_active, 'Expense category can be deactivated');

    let duplicateRejected = false;
    try { createExpenseCategory({ name: 'utilities & bills' }); } catch { duplicateRejected = true; }
    assert(duplicateRejected, 'Duplicate expense category is rejected');

    assert(session.id > 0 && session.status === 'OPEN', 'Cash session opens successfully');

    const movement = addCashMovement({
      session_id: session.id,
      movement_type: 'CASH_IN',
      amount_minor: 50000,
      description: 'Customer cash payment',
    });
    assert(movement.id > 0, 'Cash movement records in session ledger');
    const cashOut = addCashMovement({ session_id: session.id, movement_type: 'CASH_OUT', amount_minor: 25000, description: 'Drawer drop' });
    assert(cashOut.id > 0, 'Cash-out movement records in session ledger');

    let duplicateSessionRejected = false;
    try { openCashSession({ opening_cash_minor: 1 }); } catch { duplicateSessionRejected = true; }
    assert(duplicateSessionRejected, 'Duplicate open cash session is rejected');

    const currentSession = getCurrentCashSession();
    assert(currentSession?.id === session.id, 'Current cash session resolves to the active one');

    const closed = closeCashSession({
      session_id: session.id,
      actual_cash_minor: 200000,
      notes: 'Reconciled with cash drawer',
    });
    assert(closed.status === 'CLOSED', 'Cash session closes and reconciles');

    const report = getCashRegisterReport(session.id);
    assert(report.expected_closing_minor >= 0, 'Register report computes expected closing cash');
    assert(report.variance_minor === report.actual_closing_minor - report.expected_closing_minor, 'Variance reflects actual minus expected');
    assert(listAuditLogs({ search: 'CASH_SESSION', limit: 20 }).some((entry) => entry.event_type === 'CASH_SESSION_OPEN'), 'Cash session open is audited');
    assert(listAuditLogs({ search: 'CASH_IN', limit: 20 }).some((entry) => entry.event_type === 'CASH_IN'), 'Cash-in is audited');
    assert(listAuditLogs({ search: 'CASH_OUT', limit: 20 }).some((entry) => entry.event_type === 'CASH_OUT'), 'Cash-out is audited');
  } finally {
    cleanup();
  }

  console.log(`\nSummary: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

run();
