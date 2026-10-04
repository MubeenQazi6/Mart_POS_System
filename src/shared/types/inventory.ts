import type { MoneyMinor } from '@shared/utils/money';

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export type AdjustmentType = 'opening_stock' | 'manual_adjustment' | 'damage' | 'expiry';

export type MovementDirection = 'in' | 'out';

export interface StockSummaryFilters {
  search?: string;
  category_id?: number;
  low_stock_only?: boolean;
  out_of_stock_only?: boolean;
  is_active?: boolean;
}

export interface StockSummaryRow {
  variant_id: number;
  product_id: number;
  product_name: string;
  variant_name: string;
  sku: string | null;
  barcode: string | null;
  category_id: number;
  category_name: string | null;
  unit_id: number;
  unit_name: string | null;
  unit_abbreviation: string | null;
  unit_decimals: number | null;
  purchase_price_minor: MoneyMinor;
  selling_price_minor?: MoneyMinor;
  min_stock_alert: number;
  current_stock: number;
  stock_status: StockStatus;
  is_active: boolean;
}

export interface StockMovementRow {
  id: number;
  variant_id: number;
  product_id: number | null;
  product_name: string | null;
  variant_name: string | null;
  sku: string | null;
  movement_type: string;
  reference_type: string | null;
  reference_id: number | null;
  direction: MovementDirection;
  quantity: number;
  unit_cost_minor: number | null;
  notes: string | null;
  created_at: string;
}

export interface CreateMovementInput {
  variant_id: number;
  adjustment_type?: AdjustmentType;
  direction?: MovementDirection;
  quantity?: number;
  quantity_minor?: number;
  notes?: string;
  note?: string;
  source?: string;
}

export interface MovementListParams {
  variant_id?: number;
  date_from?: string;
  date_to?: string;
  movement_type?: 'IN' | 'OUT';
  reference_type?: 'purchase' | 'sale' | 'adjustment' | 'return';
  limit?: number;
}

export interface InventoryKpis {
  low_stock_count: number;
  inventory_value_minor: MoneyMinor;
  total_cost_minor?: MoneyMinor;
  potential_profit_minor?: MoneyMinor;
}
