import type { MoneyMinor } from '@shared/utils/money';

// ---- Customer Types ----

export interface CustomerRow {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  credit_limit_minor: MoneyMinor;
  opening_balance_minor: MoneyMinor;
  current_balance_minor: MoneyMinor;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerInput {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  credit_limit_minor?: MoneyMinor;
  opening_balance_minor?: MoneyMinor;
}

export interface UpdateCustomerInput {
  id: number;
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  credit_limit_minor?: MoneyMinor;
  is_active?: boolean;
}

export interface CustomerSearchParams {
  search?: string;
  is_active?: boolean;
  has_balance_only?: boolean;
}

export interface CustomerTransactionRow {
  id: number;
  customer_id: number;
  transaction_type: string; // SALE_CREDIT, PAYMENT, ADJUSTMENT
  amount_minor: MoneyMinor;
  reference_type: string | null;
  reference_id: number | null;
  notes: string | null;
  created_at: string;
}

export interface RecordCustomerPaymentInput {
  customer_id: number;
  payment_method: 'cash' | 'bank_transfer' | 'card' | 'other';
  amount_minor: MoneyMinor;
  notes?: string;
}

export interface CustomerKpis {
  total_customers_count: number;
  total_receivables_minor: MoneyMinor;
}
