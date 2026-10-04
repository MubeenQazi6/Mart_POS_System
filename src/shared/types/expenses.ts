import type { MoneyMinor } from '@shared/utils/money';

export type ExpenseStatus = 'POSTED' | 'VOIDED';
export type ExpensePaymentMethod = 'cash' | 'bank_transfer' | 'card' | 'other';

export interface ExpenseCategoryRow {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateExpenseCategoryInput {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateExpenseCategoryInput {
  id: number;
  name?: string;
  description?: string;
  is_active?: boolean;
}

export interface ExpenseRow {
  id: number;
  expense_number: string;
  category_id: number;
  category_name?: string | null;
  amount_minor: MoneyMinor;
  payment_method: ExpensePaymentMethod | string;
  description: string | null;
  expense_date: string;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  status: ExpenseStatus;
}

export interface CreateExpenseInput {
  category_id: number;
  amount_minor: MoneyMinor;
  payment_method: ExpensePaymentMethod | string;
  description?: string;
  expense_date?: string;
  created_by?: number | null;
}

export interface UpdateExpenseInput {
  id: number;
  category_id?: number;
  amount_minor?: MoneyMinor;
  payment_method?: ExpensePaymentMethod | string;
  description?: string;
  expense_date?: string;
  status?: ExpenseStatus;
}

export interface ExpenseFilters {
  category_id?: number;
  payment_method?: string;
  status?: ExpenseStatus;
  date_from?: string;
  date_to?: string;
  search?: string;
  limit?: number;
}

export interface ExpenseReportRow {
  date: string;
  expense_number: string;
  category: string;
  amount_minor: MoneyMinor;
  payment_method: string;
  user: string | null;
  status: ExpenseStatus;
}

export interface ExpenseSummaryReport {
  total_expenses_minor: MoneyMinor;
  by_category: Array<{ category: string; amount_minor: MoneyMinor }>;
  by_payment_method: Array<{ payment_method: string; amount_minor: MoneyMinor }>;
}

export interface ExpenseCategorySummary {
  total_expense_count: number;
  total_amount_minor: MoneyMinor;
}
