import { getDb } from '../database/client/index';
import { withTransaction } from './base';
import { cashSessions, cashMovements } from '../database/schema/index';
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';
import { logAuditEvent } from './audit';
import type { CashSessionRow, CashMovementRow, OpenCashSessionInput, CashMovementInput, CloseCashSessionInput, CashRegisterReport, CashReportFilters, CashShiftReportData, CashShiftReportRow } from '@shared/types/cash';

export function listCashSessions(): CashSessionRow[] {
  const db = getDb();
  return db.select().from(cashSessions).orderBy(desc(cashSessions.opened_at), desc(cashSessions.id)).all() as CashSessionRow[];
}

export function getCurrentCashSession(): CashSessionRow | null {
  const db = getDb();
  const row = db.select().from(cashSessions).where(eq(cashSessions.status, 'OPEN')).orderBy(desc(cashSessions.opened_at)).get();
  return (row ?? null) as CashSessionRow | null;
}

export function openCashSession(input: OpenCashSessionInput): CashSessionRow {
  if (!Number.isInteger(input.opening_cash_minor) || input.opening_cash_minor < 0) throw new Error('Opening cash must be a non-negative integer');
  const db = getDb();
  const existing = db.select().from(cashSessions).where(eq(cashSessions.status, 'OPEN')).get();
  if (existing) throw new Error('There is already an open cash session for this business day');

  const id = withTransaction((tx) => {
    const businessDate = (input.business_date ?? new Date().toISOString().split('T')[0]) as string;
    const insertData: typeof cashSessions.$inferInsert = {
      business_date: businessDate,
      opened_by: input.opened_by ?? null,
      opening_cash_minor: input.opening_cash_minor,
      expected_cash_minor: input.opening_cash_minor,
      status: 'OPEN',
    };

    const created = tx.insert(cashSessions).values(insertData).returning({ id: cashSessions.id }).get();

    const movement: typeof cashMovements.$inferInsert = {
      session_id: created.id,
      movement_type: 'OPENING',
      amount_minor: input.opening_cash_minor,
      reference_type: 'SESSION',
      description: 'Opening cash',
      created_by: input.opened_by ?? null,
    };

    tx.insert(cashMovements).values(movement).run();
    return created.id;
  });

  const row = db.select().from(cashSessions).where(eq(cashSessions.id, id)).get();
  if (!row) throw new Error('Cash session not created');
  logAuditEvent({ event_type: 'CASH_SESSION_OPEN', status: 'SUCCESS', details: `Opened cash session #${String(id)}` });
  return row as CashSessionRow;
}

export function addCashMovement(input: CashMovementInput): CashMovementRow {
  if (!Number.isInteger(input.amount_minor) || input.amount_minor <= 0) throw new Error('Cash movement amount must be a positive integer');
  const db = getDb();
  const session = db.select().from(cashSessions).where(eq(cashSessions.id, input.session_id)).get();
  if (!session || session.status !== 'OPEN') throw new Error('Cash session must be OPEN to record a movement');

  const row = db.insert(cashMovements).values({
    session_id: input.session_id,
    movement_type: input.movement_type,
    amount_minor: input.amount_minor,
    reference_type: input.reference_type ?? null,
    reference_id: input.reference_id ?? null,
    description: input.description ?? null,
    created_by: input.created_by ?? null,
  } as typeof cashMovements.$inferInsert).returning().get();

  logAuditEvent({ event_type: input.movement_type === 'CASH_IN' ? 'CASH_IN' : 'CASH_OUT', status: 'SUCCESS', details: `Recorded ${input.movement_type} of ${String(input.amount_minor)} minor in session #${String(input.session_id)}` });
  return row as CashMovementRow;
}

export function recordCashIn(input: Omit<CashMovementInput, 'movement_type'>): CashMovementRow {
  return addCashMovement({ ...input, movement_type: 'CASH_IN' });
}

export function recordCashOut(input: Omit<CashMovementInput, 'movement_type'>): CashMovementRow {
  return addCashMovement({ ...input, movement_type: 'CASH_OUT' });
}

export function getCashMovements(sessionId: number): CashMovementRow[] {
  const db = getDb();
  return db.select().from(cashMovements).where(eq(cashMovements.session_id, sessionId)).orderBy(desc(cashMovements.created_at), desc(cashMovements.id)).all() as CashMovementRow[];
}

export function closeCashSession(input: CloseCashSessionInput): CashSessionRow {
  const db = getDb();
  const session = db.select().from(cashSessions).where(eq(cashSessions.id, input.session_id)).get();
  if (!session) throw new Error('Cash session not found');
  if (session.status !== 'OPEN') throw new Error('Session is already closed');

  const expected = computeExpectedCash(input.session_id);
  const variance = input.actual_cash_minor - expected;

  const updated = db.update(cashSessions)
    .set({
      closed_by: input.closed_by ?? session.opened_by,
      closed_at: new Date().toISOString(),
      expected_cash_minor: expected,
      actual_cash_minor: input.actual_cash_minor,
      variance_minor: variance,
      status: 'CLOSED',
    })
    .where(eq(cashSessions.id, input.session_id))
    .returning()
    .get();

  db.insert(cashMovements).values({
    session_id: input.session_id,
    movement_type: 'CLOSING',
    amount_minor: input.actual_cash_minor,
    reference_type: 'SESSION',
    description: input.notes ?? 'Closing cash reconciled',
    created_by: input.closed_by ?? session.opened_by,
  } as typeof cashMovements.$inferInsert).run();

  logAuditEvent({ event_type: 'CASH_SESSION_CLOSE', status: 'SUCCESS', details: `Closed cash session #${String(input.session_id)} variance ${String(variance)}` });
  return updated as CashSessionRow;
}

export function computeExpectedCash(sessionId: number): number {
  const db = getDb();
  const session = db.select().from(cashSessions).where(eq(cashSessions.id, sessionId)).get();
  if (!session) throw new Error('Cash session not found');

  let expected = 0;
  const movements = db.select().from(cashMovements).where(eq(cashMovements.session_id, sessionId)).all();
  
  for (const row of movements) {
    if (['OPENING', 'CASH_IN', 'SALE', 'CUSTOMER_PAYMENT', 'ADJUSTMENT'].includes(row.movement_type)) {
      expected += row.amount_minor;
    } else if (['CASH_OUT', 'EXPENSE', 'REFUND', 'PURCHASE', 'SUPPLIER_PAYMENT'].includes(row.movement_type)) {
      expected -= row.amount_minor;
    }
  }
  return expected;
}

export function getCashRegisterReport(sessionId?: number): CashRegisterReport {
  const db = getDb();
  const session = sessionId ? db.select().from(cashSessions).where(eq(cashSessions.id, sessionId)).get() : getCurrentCashSession();
  if (!session) throw new Error('No open cash session found');
  const expected = computeExpectedCash(session.id);
  const actual = session.actual_cash_minor ?? 0;
  
  const movements = db.select().from(cashMovements).where(eq(cashMovements.session_id, session.id)).all();
  
  let cashSalesMinor = 0;
  let customerCashPaymentsMinor = 0;
  let cashExpensesMinor = 0;
  let cashInMinor = 0;
  let cashOutMinor = 0;

  for (const m of movements) {
    if (m.movement_type === 'SALE') cashSalesMinor += m.amount_minor;
    if (m.movement_type === 'CUSTOMER_PAYMENT') customerCashPaymentsMinor += m.amount_minor;
    if (m.movement_type === 'EXPENSE' || m.movement_type === 'PURCHASE' || m.movement_type === 'SUPPLIER_PAYMENT') cashExpensesMinor += m.amount_minor;
    if (m.movement_type === 'CASH_IN' || m.movement_type === 'ADJUSTMENT') cashInMinor += m.amount_minor;
    if (m.movement_type === 'CASH_OUT' || m.movement_type === 'REFUND') cashOutMinor += m.amount_minor;
  }

  return {
    opening_cash_minor: session.opening_cash_minor,
    cash_sales_minor: cashSalesMinor,
    customer_cash_payments_minor: customerCashPaymentsMinor,
    cash_expenses_minor: cashExpensesMinor,
    cash_in_minor: cashInMinor,
    cash_out_minor: cashOutMinor,
    expected_closing_minor: expected,
    actual_closing_minor: actual,
    variance_minor: actual - expected,
  };
}

export function getCashShiftReport(filters: CashReportFilters = {}): CashShiftReportData {
  const db = getDb();
  const sessions = db.select().from(cashSessions)
    .orderBy(desc(cashSessions.business_date), desc(cashSessions.id)).all();

  const result: CashShiftReportRow[] = sessions.map((session) => {
    const movementConditions = [eq(cashMovements.session_id, session.id)];
    if (filters.date_from) movementConditions.push(gte(sql`substr(${cashMovements.created_at}, 1, 10)`, filters.date_from));
    if (filters.date_to) movementConditions.push(lte(sql`substr(${cashMovements.created_at}, 1, 10)`, filters.date_to));
    const movements = db.select().from(cashMovements)
      .where(and(...movementConditions))
      .orderBy(desc(cashMovements.created_at), desc(cashMovements.id)).all() as CashMovementRow[];
    const totals = summarizeCashMovements(movements);
    return { ...session, ...totals, movements } as CashShiftReportRow;
  });

  const totals = result.reduce((summary, row) => ({
    opening_cash_minor: summary.opening_cash_minor + row.opening_cash_minor,
    cash_sales_minor: summary.cash_sales_minor + row.cash_sales_minor,
    customer_cash_payments_minor: summary.customer_cash_payments_minor + row.customer_cash_payments_minor,
    cash_expenses_minor: summary.cash_expenses_minor + row.cash_expenses_minor,
    cash_in_minor: summary.cash_in_minor + row.cash_in_minor,
    cash_out_minor: summary.cash_out_minor + row.cash_out_minor,
    expected_closing_minor: summary.expected_closing_minor + row.expected_cash_minor,
    actual_closing_minor: summary.actual_closing_minor + (row.actual_cash_minor ?? 0),
    variance_minor: summary.variance_minor + row.variance_minor,
  }), {
    opening_cash_minor: 0, cash_sales_minor: 0, customer_cash_payments_minor: 0,
    cash_expenses_minor: 0, cash_in_minor: 0, cash_out_minor: 0,
    expected_closing_minor: 0, actual_closing_minor: 0, variance_minor: 0,
  });

  return { sessions: result, totals };
}

function summarizeCashMovements(movements: CashMovementRow[]): Pick<CashShiftReportRow, 'cash_sales_minor' | 'customer_cash_payments_minor' | 'cash_expenses_minor' | 'cash_in_minor' | 'cash_out_minor'> {
  return movements.reduce((summary, movement) => {
    if (movement.movement_type === 'SALE') summary.cash_sales_minor += movement.amount_minor;
    else if (movement.movement_type === 'CUSTOMER_PAYMENT') summary.customer_cash_payments_minor += movement.amount_minor;
    else if (['EXPENSE', 'PURCHASE', 'SUPPLIER_PAYMENT'].includes(movement.movement_type)) summary.cash_expenses_minor += movement.amount_minor;
    else if (['CASH_IN', 'ADJUSTMENT'].includes(movement.movement_type)) summary.cash_in_minor += movement.amount_minor;
    else if (['CASH_OUT', 'REFUND'].includes(movement.movement_type)) summary.cash_out_minor += movement.amount_minor;
    return summary;
  }, { cash_sales_minor: 0, customer_cash_payments_minor: 0, cash_expenses_minor: 0, cash_in_minor: 0, cash_out_minor: 0 });
}
