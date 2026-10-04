import type { MoneyMinor } from '@shared/utils/money';

// ---- Supplier Types ----

export interface SupplierRow {
  id: number;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  opening_balance_minor: MoneyMinor;
  current_balance_minor: MoneyMinor;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierInput {
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  opening_balance_minor?: MoneyMinor;
}

export interface UpdateSupplierInput {
  id: number;
  name?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  is_active?: boolean;
}

export interface SupplierSearchParams {
  search?: string;
  is_active?: boolean;
}

export interface SupplierTransactionRow {
  id: number;
  supplier_id: number;
  transaction_type: string; // PURCHASE_BILL, PAYMENT, ADJUSTMENT
  amount_minor: MoneyMinor;
  reference_type: string | null;
  reference_id: number | null;
  notes: string | null;
  created_at: string;
}

export interface RecordSupplierPaymentInput {
  supplier_id: number;
  purchase_id?: number;
  payment_method: 'cash' | 'bank_transfer' | 'cheque' | 'other';
  amount_minor: MoneyMinor;
  reference_number?: string;
  notes?: string;
}

// ---- Purchase Types ----

export type PaymentStatus = 'paid' | 'partial' | 'unpaid';

export interface PurchaseItemInput {
  variant_id: number;
  quantity: number; // Scaled by 1000
  unit_cost_minor: MoneyMinor;
}

export interface PurchasePaymentInput {
  payment_method: 'cash' | 'bank_transfer' | 'cheque' | 'other';
  amount_minor: MoneyMinor;
  reference_number?: string;
  notes?: string;
}

export interface CreatePurchaseInput {
  supplier_id: number;
  supplier_invoice_number?: string;
  items: PurchaseItemInput[];
  discount_minor?: MoneyMinor;
  tax_minor?: MoneyMinor;
  payments?: PurchasePaymentInput[];
  update_variant_cost?: boolean; // If true, updates product_variants.purchase_price_minor
  notes?: string;
}

export interface PurchaseSearchParams {
  supplier_id?: number;
  payment_status?: PaymentStatus;
  date_from?: string;
  date_to?: string;
  search?: string;
  limit?: number;
}

export interface PurchaseRow {
  id: number;
  purchase_number: string;
  supplier_id: number;
  supplier_name?: string | null;
  supplier_invoice_number: string | null;
  subtotal_minor: MoneyMinor;
  discount_minor: MoneyMinor;
  tax_minor: MoneyMinor;
  total_minor: MoneyMinor;
  paid_amount_minor: MoneyMinor;
  balance_minor: MoneyMinor;
  payment_status: PaymentStatus;
  notes: string | null;
  created_at: string;
  items?: PurchaseItemRow[];
  payments?: PurchasePaymentRow[];
}

export interface PurchaseItemRow {
  id: number;
  purchase_id: number;
  variant_id: number;
  quantity: number;
  unit_cost_minor: MoneyMinor;
  line_total_minor: MoneyMinor;
  product_name?: string | null;
  variant_name?: string | null;
  sku?: string | null;
  unit_abbreviation?: string | null;
  unit_decimals?: number | null;
}

export interface PurchasePaymentRow {
  id: number;
  purchase_id: number | null;
  supplier_id: number;
  payment_method: string;
  amount_minor: MoneyMinor;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
}

export interface PurchaseKpis {
  total_purchases_count: number;
  total_purchases_value_minor: MoneyMinor;
  total_payables_minor: MoneyMinor;
}
