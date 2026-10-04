// ---- Sale Input Types ----

/** A single item in the cart sent from the renderer. */
export interface CartItemInput {
  variant_id: number;
  quantity: number; // Scaled by 1000 (e.g. 1 piece = 1000, 1.5 KG = 1500)
  discount_minor: number; // Per-item discount in minor units
  is_manual?: boolean;
}

/** Input for creating a sale — sent from renderer to main process. */
export interface CreateSaleInput {
  items: CartItemInput[];
  payments: PaymentInput[];
  discount_minor: number; // Bill-level discount in minor units
  customer_id?: number;
  notes?: string;
}

/** A single payment entry. */
export interface PaymentInput {
  payment_method: 'cash' | 'card' | 'credit';
  amount_minor: number;
  tendered_minor?: number;
}

export interface SaleSearchParams {
  search?: string;
  status?: SaleStatus;
  limit?: number;
}

// ---- Sale Output Types ----

export type SaleStatus = 'completed' | 'cancelled';

export interface SaleRow {
  id: number;
  invoice_number: string;
  subtotal_minor: number;
  discount_minor: number;
  tax_minor: number;
  total_minor: number;
  status: SaleStatus;
  notes: string | null;
  created_at: string;
  items?: SaleItemRow[];
  payments?: SalePaymentRow[];
}

export interface SaleItemRow {
  id: number;
  sale_id: number;
  variant_id: number;
  quantity: number;
  unit_price_minor: number;
  discount_minor: number;
  line_total_minor: number;
  is_manual?: boolean;
  // Joined fields for display
  product_name?: string | null;
  variant_name?: string | null;
  sku?: string | null;
}

export interface SalePaymentRow {
  id: number;
  sale_id: number;
  payment_method: string;
  amount_minor: number;
  tendered_minor?: number | null;
}

// ---- Held Bill Types ----

export interface HeldBillRow {
  id: number;
  cart_data: string; // JSON string
  notes: string | null;
  created_at: string;
}

export interface HoldBillInput {
  items: CartItemInput[];
  discount_minor: number;
  notes?: string;
}

// ---- Lookup result for POS barcode scanning ----

export interface PosLookupResult {
  variant_id: number;
  product_id: number;
  product_name: string;
  variant_name: string;
  sku: string | null;
  selling_price_minor: number;
  barcode: string;
  is_active: boolean;
  available_stock: number;
}
