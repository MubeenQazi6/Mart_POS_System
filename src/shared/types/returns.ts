import type { MoneyMinor } from '@shared/utils/money';

export type ReturnCondition = 'resalable' | 'damaged' | 'defective';
export type ReturnPaymentMethod = 'cash' | 'card' | 'credit' | 'bank_transfer' | 'other';
export type ExchangeSettlementMethod = 'cash' | 'card' | 'credit' | 'even' | 'balance_adjustment';

export interface ReturnItemInput {
  source_item_id: number;
  quantity: number; // Scaled by 1000
  return_condition?: ReturnCondition;
}

export interface ReplacementItemInput {
  variant_id: number;
  quantity: number; // Scaled by 1000
  unit_price_minor?: number;
}

export interface CreateSalesReturnInput {
  sale_id: number;
  customer_id?: number | null;
  items: ReturnItemInput[];
  reason: string;
  refund_method: ReturnPaymentMethod;
}

export interface CreateSalesExchangeInput {
  sale_id: number;
  customer_id?: number | null;
  return_items: ReturnItemInput[];
  replacement_items: ReplacementItemInput[];
  reason: string;
  settlement_method: ExchangeSettlementMethod;
}

export interface CreatePurchaseReturnInput {
  purchase_id: number;
  items: ReturnItemInput[];
  reason: string;
  refund_method: ReturnPaymentMethod;
}

export interface CreatePurchaseExchangeInput {
  purchase_id: number;
  return_items: ReturnItemInput[];
  replacement_items: ReplacementItemInput[];
  reason: string;
  settlement_method: 'balance_adjustment' | 'cash' | 'even';
}

export interface ReturnItemRow {
  id: number;
  source_item_id: number;
  variant_id: number;
  quantity: number;
  amount_minor: MoneyMinor;
  unit_amount_minor?: MoneyMinor;
  original_unit_price_minor?: MoneyMinor;
  discount_minor?: MoneyMinor;
  original_quantity?: number;
  remaining_quantity?: number;
  product_name: string | null;
  variant_name: string | null;
  sku?: string | null;
  barcode?: string | null;
  return_condition?: ReturnCondition;
}

export interface ExchangeReplacementItemRow {
  id: number;
  variant_id: number;
  quantity: number;
  unit_price_minor: MoneyMinor;
  total_amount_minor: MoneyMinor;
  product_name: string | null;
  variant_name: string | null;
  sku?: string | null;
  barcode?: string | null;
}

export interface ReturnRow {
  id: number;
  return_number: string;
  source_id: number;
  source_number: string;
  party_name: string | null;
  refund_amount_minor: MoneyMinor;
  refund_method: string;
  reason: string;
  created_at: string;
  items?: ReturnItemRow[];
  replacement_items?: ExchangeReplacementItemRow[];
  return_type?: 'sales' | 'purchase';
  record_type?: 'return' | 'exchange';
  return_total_minor?: MoneyMinor;
  replacement_total_minor?: MoneyMinor;
  difference_minor?: MoneyMinor;
  settlement_method?: string;
  customer_phone?: string | null;
  customer_id?: number | null;
}

export interface ExchangeRow {
  id: number;
  exchange_number: string;
  source_id: number;
  source_number: string;
  party_name: string | null;
  customer_phone?: string | null;
  return_total_minor: MoneyMinor;
  replacement_total_minor: MoneyMinor;
  difference_minor: MoneyMinor;
  settlement_method: string;
  reason: string;
  created_at: string;
  return_items: ReturnItemRow[];
  replacement_items: ExchangeReplacementItemRow[];
  exchange_type?: 'sales' | 'purchase';
}