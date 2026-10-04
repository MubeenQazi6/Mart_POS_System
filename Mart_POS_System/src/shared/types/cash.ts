import type { MoneyMinor } from '@shared/utils/money';

export type CashSessionStatus = 'OPEN' | 'CLOSED';
export type CashMovementType = 'OPENING' | 'SALE' | 'CUSTOMER_PAYMENT' | 'EXPENSE' | 'CASH_IN' | 'CASH_OUT' | 'ADJUSTMENT' | 'CLOSING' | 'REFUND' | 'PURCHASE' | 'SUPPLIER_PAYMENT';

export interface CashSessionRow {
  id: number;
  business_date: string;
  opened_by: number | null;
  opened_at: string;
  opening_cash_minor: MoneyMinor;
  closed_by: number | null;
  closed_at: string | null;
  expected_cash_minor: MoneyMinor;
  actual_cash_minor: MoneyMinor | null;
  variance_minor: MoneyMinor;
  status: CashSessionStatus;
}

export interface CashMovementRow {
  id: number;
  session_id: number;
  movement_type: CashMovementType;
  amount_minor: MoneyMinor;
  reference_type: string | null;
  reference_id: number | null;
  description: string | null;
  created_by: number | null;
  created_at: string;
}

export interface OpenCashSessionInput {
  business_date?: string;
  opening_cash_minor: MoneyMinor;
  opened_by?: number | null;
}

export interface CashMovementInput {
  session_id: number;
  movement_type: CashMovementType;
  amount_minor: MoneyMinor;
  reference_type?: string | null;
  reference_id?: number | null;
  description?: string;
  created_by?: number | null;
}

export interface CloseCashSessionInput {
  session_id: number;
  actual_cash_minor: MoneyMinor;
  closed_by?: number | null;
  notes?: string;
}

export interface CashRegisterReport {
  opening_cash_minor: MoneyMinor;
  cash_sales_minor: MoneyMinor;
  customer_cash_payments_minor: MoneyMinor;
  cash_expenses_minor: MoneyMinor;
  cash_in_minor: MoneyMinor;
  cash_out_minor: MoneyMinor;
  expected_closing_minor: MoneyMinor;
  actual_closing_minor: MoneyMinor;
  variance_minor: MoneyMinor;
}
