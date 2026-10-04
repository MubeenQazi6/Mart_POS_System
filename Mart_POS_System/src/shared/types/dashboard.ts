import type { MoneyMinor } from '@shared/utils/money';

export type DashboardDatePreset = 'today' | 'yesterday' | '7d' | '30d' | 'this_month' | 'custom';

export interface DashboardKpiInput {
  preset?: DashboardDatePreset;
  date_from?: string;
  date_to?: string;
  low_stock_only?: boolean;
}

export interface DashboardKpis {
  sales_revenue_minor: MoneyMinor;
  sales_invoice_count: number;
  today_sales_revenue_minor: MoneyMinor;
  today_sales_invoice_count: number;
  purchases_amount_minor: MoneyMinor;
  purchases_invoice_count: number;
  today_purchases_amount_minor: MoneyMinor;
  today_purchases_invoice_count: number;
  gross_profit_minor: MoneyMinor;
  expenses_minor: MoneyMinor;
  net_profit_minor: MoneyMinor;
  customer_receivables_minor: MoneyMinor;
  supplier_payables_minor: MoneyMinor;
  inventory_value_minor: MoneyMinor;
  active_product_count: number;
  active_customer_count: number;
  active_supplier_count: number;
  low_stock_count: number;
  out_of_stock_count: number;
  low_stock_items: DashboardLowStockItem[];
  returns_amount_minor: MoneyMinor;
  returns_count: number;
}

export interface DashboardSalesTrendPoint {
  date: string;
  sales_revenue_minor: MoneyMinor;
  invoice_count: number;
  gross_profit_minor: MoneyMinor;
}

export interface DashboardTopProduct {
  product_name: string;
  variant_name: string;
  quantity_sold: number;
  revenue_minor: MoneyMinor;
  gross_profit_minor: MoneyMinor;
}

export interface DashboardPaymentBreakdown {
  cash_minor: MoneyMinor;
  card_minor: MoneyMinor;
  credit_minor: MoneyMinor;
  split_minor: MoneyMinor;
}

export interface DashboardLowStockItem {
  product_name: string;
  variant_name: string;
  sku: string | null;
  current_stock: number;
  min_stock_alert: number;
  status: 'low_stock' | 'out_of_stock';
}

export interface DashboardActivityItem {
  id: number;
  type: 'sale' | 'purchase' | 'payment' | 'stock_adjustment';
  label: string;
  amount_minor?: MoneyMinor;
  created_at: string;
}

export interface DashboardQuery {
  preset?: DashboardDatePreset;
  date_from?: string;
  date_to?: string;
  limit?: number;
}
