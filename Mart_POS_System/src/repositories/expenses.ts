import { getDb } from '../database/client/index';
import { withTransaction } from './base';
import { settings, expenseCategories, expenses, users, cashSessions, cashMovements } from '../database/schema/index';
import { eq, and, desc, gte, lte, like, or, sql } from 'drizzle-orm';
import { logAuditEvent } from './audit';
import type {
  ExpenseCategoryRow,
  CreateExpenseCategoryInput,
  UpdateExpenseCategoryInput,
  ExpenseRow,
  CreateExpenseInput,
  UpdateExpenseInput,
  ExpenseFilters,
  ExpenseReportRow,
  ExpenseSummaryReport,
  ExpenseStatus,
} from '@shared/types/expenses';

const EXPENSE_SEQUENCE_KEY = 'expense.internal_sequence';

export function generateExpenseNumber(seq: number): string {
  return `EXP-${seq.toString().padStart(5, '0')}`;
}

export function listExpenseCategories(search?: string, is_active?: boolean): ExpenseCategoryRow[] {
  const db = getDb();
  let query = db.select().from(expenseCategories);
  const conditions = [] as any[];

  if (typeof is_active === 'boolean') {
    conditions.push(eq(expenseCategories.is_active, is_active));
  }
  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(or(like(expenseCategories.name, term), like(expenseCategories.description, term)));
  }

  if (conditions.length > 0) query = query.where(and(...conditions)) as typeof query;
  return query.orderBy(desc(expenseCategories.created_at), desc(expenseCategories.id)).all();
}

export function createExpenseCategory(input: CreateExpenseCategoryInput): ExpenseCategoryRow {
  if (!input.name.trim()) throw new Error('Category name is required');
  const db = getDb();
  const duplicate = db.select().from(expenseCategories).where(sql`lower(${expenseCategories.name}) = lower(${input.name.trim()})`).get();
  if (duplicate) throw new Error(`Expense category "${input.name.trim()}" already exists`);
  const created = db.insert(expenseCategories).values({
    name: input.name.trim(),
    description: input.description?.trim() || null,
    is_active: input.is_active ?? true,
  }).returning().get();
  logAuditEvent({ event_type: 'EXPENSE_CATEGORY_CREATE', status: 'SUCCESS', details: `Created expense category ${created.name}` });
  return created;
}

export function updateExpenseCategory(input: UpdateExpenseCategoryInput): ExpenseCategoryRow {
  const db = getDb();
  const updateData: Partial<typeof expenseCategories.$inferInsert> = { updated_at: new Date().toISOString() };
  if (input.name !== undefined) updateData.name = input.name.trim() || undefined;
  if (input.description !== undefined) updateData.description = input.description.trim() || null;
  if (input.is_active !== undefined) updateData.is_active = input.is_active;

  db.update(expenseCategories).set(updateData).where(eq(expenseCategories.id, input.id)).run();
  const row = db.select().from(expenseCategories).where(eq(expenseCategories.id, input.id)).get();
  if (!row) throw new Error(`Expense category ${String(input.id)} not found`);
  logAuditEvent({ event_type: 'EXPENSE_CATEGORY_UPDATE', status: 'SUCCESS', details: `Updated expense category ${row.name}` });
  return row;
}

export function listExpenses(filters: ExpenseFilters = {}): ExpenseRow[] {
  const db = getDb();
  let query = db
    .select({
      id: expenses.id,
      expense_number: expenses.expense_number,
      category_id: expenses.category_id,
      category_name: expenseCategories.name,
      amount_minor: expenses.amount_minor,
      payment_method: expenses.payment_method,
      description: expenses.description,
      expense_date: expenses.expense_date,
      created_by: expenses.created_by,
      created_at: expenses.created_at,
      updated_at: expenses.updated_at,
      status: expenses.status,
    })
    .from(expenses)
    .leftJoin(expenseCategories, eq(expenses.category_id, expenseCategories.id));

  const conditions = [] as any[];
  if (filters.category_id !== undefined) conditions.push(eq(expenses.category_id, filters.category_id));
  if (filters.payment_method) conditions.push(eq(expenses.payment_method, filters.payment_method));
  if (filters.status) conditions.push(eq(expenses.status, filters.status));
  if (filters.date_from) conditions.push(gte(expenses.expense_date, filters.date_from));
  if (filters.date_to) conditions.push(lte(expenses.expense_date, filters.date_to));
  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    conditions.push(or(like(expenses.expense_number, term), like(expenses.description, term), like(expenseCategories.name, term)));
  }

  if (conditions.length > 0) query = query.where(and(...conditions)) as typeof query;
  const limit = filters.limit && filters.limit > 0 ? filters.limit : 100;
  return query.orderBy(desc(expenses.expense_date), desc(expenses.id)).limit(limit).all() as ExpenseRow[];
}

export function getExpenseById(id: number): ExpenseRow {
  const row = listExpenses({ limit: 1 }).find((item) => item.id === id);
  if (!row) throw new Error(`Expense ${String(id)} not found`);
  return row;
}

export function createExpense(input: CreateExpenseInput): ExpenseRow {
  if (!Number.isInteger(input.category_id) || input.category_id <= 0) throw new Error('Valid category ID is required');
  if (!Number.isInteger(input.amount_minor) || input.amount_minor <= 0) throw new Error('Amount must be a positive integer minor value');

  const expenseId = withTransaction((tx) => {
    const category = tx.select().from(expenseCategories).where(eq(expenseCategories.id, input.category_id)).get();
    if (!category) throw new Error(`Expense category ${String(input.category_id)} not found`);

    const currentSeqRow = tx.select().from(settings).where(eq(settings.key, EXPENSE_SEQUENCE_KEY)).get();
    let nextSeq = 1;
    if (currentSeqRow) {
      const parsed = Number.parseInt(currentSeqRow.value, 10);
      if (!Number.isNaN(parsed) && parsed >= 0) nextSeq = parsed + 1;
    }

    const now = new Date().toISOString();
    if (currentSeqRow) {
      tx.update(settings).set({ value: String(nextSeq), updated_at: now }).where(eq(settings.key, EXPENSE_SEQUENCE_KEY)).run();
    } else {
      tx.insert(settings).values({ key: EXPENSE_SEQUENCE_KEY, value: String(nextSeq), updated_at: now } as typeof settings.$inferInsert).run();
    }

    const inserted = tx.insert(expenses).values({
      expense_number: generateExpenseNumber(nextSeq),
      category_id: input.category_id,
      amount_minor: input.amount_minor,
      payment_method: input.payment_method,
      description: input.description?.trim() || null,
      expense_date: input.expense_date ?? new Date().toISOString().split('T')[0],
      created_by: input.created_by ?? null,
      status: 'POSTED',
    } as typeof expenses.$inferInsert).returning({ id: expenses.id }).get();

    if (input.payment_method === 'cash') {
      const session = tx.select().from(cashSessions).where(eq(cashSessions.status, 'OPEN')).orderBy(desc(cashSessions.opened_at)).get();
      if (session) {
        tx.insert(cashMovements).values({
          session_id: session.id,
          movement_type: 'EXPENSE',
          amount_minor: input.amount_minor,
          reference_type: 'EXPENSE',
          reference_id: inserted.id,
          description: input.description?.trim() || 'Cash expense',
          created_by: input.created_by ?? null,
        }).run();
      }
    }

    return inserted.id;
  });

  const row = getExpenseById(expenseId);
  logAuditEvent({ event_type: 'EXPENSE_CREATE', status: 'SUCCESS', details: `Created expense ${row.expense_number}` });
  return row;
}

export function updateExpense(input: UpdateExpenseInput): ExpenseRow {
  const db = getDb();
  const updateData: Partial<typeof expenses.$inferInsert> = { updated_at: new Date().toISOString() };
  if (input.category_id !== undefined) updateData.category_id = input.category_id;
  if (input.amount_minor !== undefined) updateData.amount_minor = input.amount_minor;
  if (input.payment_method !== undefined) updateData.payment_method = input.payment_method;
  if (input.description !== undefined) updateData.description = input.description?.trim() || null;
  if (input.expense_date !== undefined) updateData.expense_date = input.expense_date;
  if (input.status !== undefined) updateData.status = input.status;

  db.update(expenses).set(updateData).where(eq(expenses.id, input.id)).run();
  const row = getExpenseById(input.id);
  logAuditEvent({ event_type: 'EXPENSE_UPDATE', status: 'SUCCESS', details: `Updated expense ${row.expense_number}` });
  return row;
}

export function voidExpense(id: number): ExpenseRow {
  if (!Number.isInteger(id) || id <= 0) throw new Error('Valid expense ID is required');

  const expenseId = withTransaction((tx) => {
    const row = tx.select().from(expenses).where(eq(expenses.id, id)).get();
    if (!row) throw new Error(`Expense ${String(id)} not found`);
    if (row.status === 'VOIDED') return row.id;

    if (row.payment_method === 'cash') {
      const session = tx.select().from(cashSessions).where(eq(cashSessions.status, 'OPEN')).orderBy(desc(cashSessions.opened_at)).get();
      if (session) {
        tx.insert(cashMovements).values({
          session_id: session.id,
          movement_type: 'CASH_IN',
          amount_minor: row.amount_minor,
          reference_type: 'EXPENSE_VOID',
          reference_id: id,
          description: `Voided cash expense ${row.expense_number}`,
        }).run();
      }
    }
    
    tx.update(expenses).set({ status: 'VOIDED', updated_at: new Date().toISOString() }).where(eq(expenses.id, id)).run();
    return row.id;
  });

  const updated = getExpenseById(expenseId);
  logAuditEvent({ event_type: 'EXPENSE_VOID', status: 'SUCCESS', details: `Voided expense ${updated.expense_number}` });
  return updated;
}

export function getExpenseTotalForRange(params: { date_from?: string; date_to?: string } = {}): number {
  const db = getDb();
  let query: any = db.select({ total: expenses.amount_minor }).from(expenses).where(eq(expenses.status, 'POSTED'));
  const conditions = [] as any[];
  if (params.date_from) conditions.push(gte(expenses.expense_date, params.date_from));
  if (params.date_to) conditions.push(lte(expenses.expense_date, params.date_to));
  if (conditions.length > 0) query = query.where(and(...conditions));

  const rows: Array<{ total: number }> = query.all();
  return rows.reduce((sum: number, row: { total: number }) => sum + Number(row.total), 0);
}

export function getExpenseReport(filters: ExpenseFilters = {}): ExpenseReportRow[] {
  const db = getDb();
  let query: any = db
    .select({
      date: expenses.expense_date,
      expense_number: expenses.expense_number,
      category: expenseCategories.name,
      amount_minor: expenses.amount_minor,
      payment_method: expenses.payment_method,
      user: users.full_name,
      status: expenses.status,
    })
    .from(expenses)
    .leftJoin(expenseCategories, eq(expenses.category_id, expenseCategories.id))
    .leftJoin(users, eq(expenses.created_by, users.id));

  const conditions = [] as any[];
  if (filters.category_id) conditions.push(eq(expenses.category_id, filters.category_id));
  if (filters.payment_method) conditions.push(eq(expenses.payment_method, filters.payment_method));
  if (filters.status) conditions.push(eq(expenses.status, filters.status));
  if (filters.date_from) conditions.push(gte(expenses.expense_date, filters.date_from));
  if (filters.date_to) conditions.push(lte(expenses.expense_date, filters.date_to));
  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    conditions.push(or(like(expenses.expense_number, term), like(expenseCategories.name, term), like(expenses.description, term)));
  }
  if (conditions.length > 0) query = query.where(and(...conditions));

  const rows: Array<{
    date: string;
    expense_number: string;
    category: string | null;
    amount_minor: number;
    payment_method: string;
    user: string | null;
    status: string;
  }> = query.orderBy(desc(expenses.expense_date), desc(expenses.id)).limit(filters.limit && filters.limit > 0 ? filters.limit : 100).all();
  return rows.map((row: {
    date: string;
    expense_number: string;
    category: string | null;
    amount_minor: number;
    payment_method: string;
    user: string | null;
    status: string;
  }) => ({
    date: String(row.date),
    expense_number: String(row.expense_number),
    category: String(row.category ?? 'Uncategorized'),
    amount_minor: Number(row.amount_minor),
    payment_method: String(row.payment_method),
    user: row.user ? String(row.user) : null,
    status: row.status as ExpenseStatus,
  }));
}

export function getExpenseSummaryReport(filters: ExpenseFilters = {}): ExpenseSummaryReport {
  const rows = getExpenseReport(filters);
  const byCategory = new Map<string, number>();
  const byMethod = new Map<string, number>();

  for (const row of rows) {
    byCategory.set(row.category, (byCategory.get(row.category) ?? 0) + row.amount_minor);
    byMethod.set(row.payment_method, (byMethod.get(row.payment_method) ?? 0) + row.amount_minor);
  }

  return {
    total_expenses_minor: rows.reduce((sum, row) => sum + row.amount_minor, 0),
    by_category: Array.from(byCategory.entries()).map(([category, amount_minor]) => ({ category, amount_minor })),
    by_payment_method: Array.from(byMethod.entries()).map(([payment_method, amount_minor]) => ({ payment_method, amount_minor })),
  };
}
