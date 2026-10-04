import type { MoneyMinor } from '@shared/utils/money';
import type { SaleRow } from './sales';
import type { PurchaseRow } from './purchases';
import type { StockMovementRow, StockSummaryRow } from './inventory';
import type { SupplierRow } from './purchases';
import type { CustomerRow } from './customers';

export type ReportType =
  | 'sales'
  | 'purchases'
  | 'inventory'
  | 'stock_movements'
  | 'suppliers_payable'
  | 'customers_khata'
  | 'profit_summary';

export type DatePreset = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom';

export interface ReportFilterParams {
  date_from?: string; // YYYY-MM-DD or ISO
  date_to?: string;   // YYYY-MM-DD or ISO
  category_id?: number;
  supplier_id?: number;
  customer_id?: number;
  user_id?: number;
  payment_method?: string;
  status?: string;
  low_stock_only?: boolean;
  limit?: number;
}

// Sales Report
export interface SalesReportSummary {
  total_sales_count: number;
  subtotal_minor: MoneyMinor;
  discount_minor: MoneyMinor;
  tax_minor: MoneyMinor;
  net_sales_minor: MoneyMinor;
  cash_collected_minor: MoneyMinor;
  card_collected_minor: MoneyMinor;
  credit_generated_minor: MoneyMinor;
}

export interface SalesReportData {
  summary: SalesReportSummary;
  rows: SaleRow[];
}

// Purchases Report
export interface PurchasesReportSummary {
  total_purchases_count: number;
  subtotal_minor: MoneyMinor;
  discount_minor: MoneyMinor;
  tax_minor: MoneyMinor;
  total_purchases_minor: MoneyMinor;
  total_paid_minor: MoneyMinor;
  total_balance_minor: MoneyMinor;
}

export interface PurchasesReportData {
  summary: PurchasesReportSummary;
  rows: PurchaseRow[];
}

// Inventory Report
export interface InventoryReportSummary {
  total_items_count: number;
  total_in_stock_items: number;
  total_low_stock_items: number;
  total_out_of_stock_items: number;
  total_valuation_purchase_minor: MoneyMinor;
  total_valuation_retail_minor: MoneyMinor;
}

export interface InventoryReportData {
  summary: InventoryReportSummary;
  rows: StockSummaryRow[];
}

// Stock Movement Report
export interface StockMovementReportSummary {
  total_movements_count: number;
  total_in_movements: number;
  total_out_movements: number;
  total_in_quantity: number;
  total_out_quantity: number;
}

export interface StockMovementReportData {
  summary: StockMovementReportSummary;
  rows: StockMovementRow[];
}

// Suppliers Payable Report
export interface SuppliersPayableReportSummary {
  total_suppliers_count: number;
  total_payable_balance_minor: MoneyMinor;
}

export interface SuppliersPayableReportData {
  summary: SuppliersPayableReportSummary;
  rows: SupplierRow[];
}

// Customers Khata Report
export interface CustomersKhataReportSummary {
  total_customers_count: number;
  total_receivable_balance_minor: MoneyMinor;
  total_credit_limit_minor: MoneyMinor;
}

export interface CustomersKhataReportData {
  summary: CustomersKhataReportSummary;
  rows: CustomerRow[];
}

// Profit Summary Report
export interface ProfitSummaryItem {
  variant_id: number;
  product_name: string;
  variant_name: string;
  sku: string | null;
  units_sold: number;
  selling_revenue_minor: MoneyMinor;
  cost_of_goods_sold_minor: MoneyMinor;
  gross_profit_minor: MoneyMinor;
  margin_percentage: number;
}

export interface ProfitSummaryData {
  total_revenue_minor: MoneyMinor;
  total_cogs_minor: MoneyMinor;
  total_gross_profit_minor: MoneyMinor;
  overall_margin_percentage: number;
  items: ProfitSummaryItem[];
}

// Export Types
export type ExportFormat = 'csv' | 'xlsx' | 'pdf';

export interface ExportReportInput {
  report_type: ReportType;
  format: ExportFormat;
  title: string;
  filters: ReportFilterParams;
  headers: string[];
  rows: (string | number)[][];
  summaryLines?: { label: string; value: string }[];
}

export interface ExportResult {
  filePath?: string;
  canceled?: boolean;
}
