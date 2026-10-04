import { create } from 'zustand';
import type {
  ReportType,
  DatePreset,
  ReportFilterParams,
  SalesReportData,
  PurchasesReportData,
  InventoryReportData,
  StockMovementReportData,
  SuppliersPayableReportData,
  CustomersKhataReportData,
  ProfitSummaryData,
  ExportFormat,
} from '@shared/types/reports';
import { showToast } from '@renderer/components/ui/Toast';

interface ReportsState {
  activeReport: ReportType;
  datePreset: DatePreset;
  filters: ReportFilterParams;
  isLoading: boolean;
  isExporting: boolean;

  salesData: SalesReportData | null;
  purchasesData: PurchasesReportData | null;
  inventoryData: InventoryReportData | null;
  movementsData: StockMovementReportData | null;
  suppliersData: SuppliersPayableReportData | null;
  customersData: CustomersKhataReportData | null;
  profitData: ProfitSummaryData | null;

  setActiveReport: (type: ReportType) => void;
  setDatePreset: (preset: DatePreset) => void;
  setFilters: (filters: Partial<ReportFilterParams>) => void;
  loadCurrentReport: () => Promise<void>;
  exportCurrentReport: (format: ExportFormat) => Promise<void>;
}

function computePresetDates(preset: DatePreset): { date_from?: string; date_to?: string } {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  if (preset === 'today') {
    return { date_from: todayStr, date_to: todayStr };
  }
  if (preset === 'yesterday') {
    const yest = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yestStr = yest.toISOString().split('T')[0];
    return { date_from: yestStr, date_to: yestStr };
  }
  if (preset === 'this_week') {
    const dayOfWeek = now.getDay() || 7; // Monday = 1
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek + 1);
    const monStr = monday.toISOString().split('T')[0];
    return { date_from: monStr, date_to: todayStr };
  }
  if (preset === 'this_month') {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayStr = firstDay.toISOString().split('T')[0];
    return { date_from: firstDayStr, date_to: todayStr };
  }
  return {};
}

export const useReportsStore = create<ReportsState>((set, get) => ({
  activeReport: 'sales',
  datePreset: 'this_month',
  filters: computePresetDates('this_month'),
  isLoading: false,
  isExporting: false,

  salesData: null,
  purchasesData: null,
  inventoryData: null,
  movementsData: null,
  suppliersData: null,
  customersData: null,
  profitData: null,

  setActiveReport: (type) => {
    set({ activeReport: type });
    void get().loadCurrentReport();
  },

  setDatePreset: (preset) => {
    const dates = computePresetDates(preset);
    set((state) => ({
      datePreset: preset,
      filters: { ...state.filters, ...dates },
    }));
    void get().loadCurrentReport();
  },

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
    void get().loadCurrentReport();
  },

  loadCurrentReport: async () => {
    if (!window.martpos) return;
    const { activeReport, filters } = get();
    set({ isLoading: true });

    try {
      if (activeReport === 'sales') {
        const res = await window.martpos.reports.getSales(filters);
        if (res.success) set({ salesData: res.data });
      } else if (activeReport === 'purchases') {
        const res = await window.martpos.reports.getPurchases(filters);
        if (res.success) set({ purchasesData: res.data });
      } else if (activeReport === 'inventory') {
        const res = await window.martpos.reports.getInventory(filters);
        if (res.success) set({ inventoryData: res.data });
      } else if (activeReport === 'stock_movements') {
        const res = await window.martpos.reports.getMovements(filters);
        if (res.success) set({ movementsData: res.data });
      } else if (activeReport === 'suppliers_payable') {
        const res = await window.martpos.reports.getSuppliers(filters);
        if (res.success) set({ suppliersData: res.data });
      } else if (activeReport === 'customers_khata') {
        const res = await window.martpos.reports.getCustomers(filters);
        if (res.success) set({ customersData: res.data });
      } else {
        const res = await window.martpos.reports.getProfitSummary(filters);
        if (res.success) set({ profitData: res.data });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  exportCurrentReport: async (format) => {
    if (!window.martpos) return;
    const { activeReport, filters, salesData, purchasesData, inventoryData, movementsData, suppliersData, customersData, profitData } = get();

    let title = 'Report';
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let summaryLines: { label: string; value: string }[] | undefined;

    if (activeReport === 'sales' && salesData) {
      title = 'Sales_Report';
      summaryLines = [
        { label: 'Total Invoices', value: String(salesData.summary.total_sales_count) },
        { label: 'Net Sales', value: `Rs. ${(salesData.summary.net_sales_minor / 100).toFixed(2)}` },
        { label: 'Cash Collected', value: `Rs. ${(salesData.summary.cash_collected_minor / 100).toFixed(2)}` },
        { label: 'Khata Credit', value: `Rs. ${(salesData.summary.credit_generated_minor / 100).toFixed(2)}` },
      ];
      headers = ['Invoice #', 'Date / Time', 'Status', 'Subtotal', 'Discount', 'Tax', 'Total Amount', 'Payments'];
      rows = salesData.rows.map((r) => [
        r.invoice_number,
        r.created_at,
        r.status,
        (r.subtotal_minor / 100).toFixed(2),
        (r.discount_minor / 100).toFixed(2),
        (r.tax_minor / 100).toFixed(2),
        (r.total_minor / 100).toFixed(2),
        r.payments?.map((p) => `${p.payment_method}: Rs. ${(p.amount_minor / 100).toFixed(2)}`).join(' | ') || '—',
      ]);
    } else if (activeReport === 'purchases' && purchasesData) {
      title = 'Purchases_Report';
      summaryLines = [
        { label: 'Total Orders', value: String(purchasesData.summary.total_purchases_count) },
        { label: 'Total Value', value: `Rs. ${(purchasesData.summary.total_purchases_minor / 100).toFixed(2)}` },
        { label: 'Paid Amount', value: `Rs. ${(purchasesData.summary.total_paid_minor / 100).toFixed(2)}` },
        { label: 'Payables Balance', value: `Rs. ${(purchasesData.summary.total_balance_minor / 100).toFixed(2)}` },
      ];
      headers = ['PO Number', 'Date', 'Supplier', 'Supplier Inv #', 'Total', 'Paid', 'Balance', 'Status'];
      rows = purchasesData.rows.map((p) => [
        p.purchase_number,
        p.created_at,
        p.supplier_name || '—',
        p.supplier_invoice_number || '—',
        (p.total_minor / 100).toFixed(2),
        (p.paid_amount_minor / 100).toFixed(2),
        (p.balance_minor / 100).toFixed(2),
        p.payment_status,
      ]);
    } else if (activeReport === 'inventory' && inventoryData) {
      title = 'Inventory_Valuation_Report';
      summaryLines = [
        { label: 'Total Products', value: String(inventoryData.summary.total_items_count) },
        { label: 'In Stock', value: String(inventoryData.summary.total_in_stock_items) },
        { label: 'Low Stock', value: String(inventoryData.summary.total_low_stock_items) },
        { label: 'Total Purchase Valuation', value: `Rs. ${(inventoryData.summary.total_valuation_purchase_minor / 100).toFixed(2)}` },
        { label: 'Total Retail Valuation', value: `Rs. ${(inventoryData.summary.total_valuation_retail_minor / 100).toFixed(2)}` },
      ];
      headers = ['Product', 'Variant', 'SKU', 'Barcode', 'Category', 'Stock Qty', 'Purchase Cost', 'Retail Price', 'Purchase Value'];
      rows = inventoryData.rows.map((i) => [
        i.product_name,
        i.variant_name,
        i.sku || '—',
        i.barcode || '—',
        i.category_name || '—',
        (i.current_stock / 1000).toFixed(i.unit_decimals || 0),
        (i.purchase_price_minor / 100).toFixed(2),
        ((i.selling_price_minor ?? 0) / 100).toFixed(2),
        ((i.current_stock * i.purchase_price_minor) / 100000).toFixed(2),
      ]);
    } else if (activeReport === 'stock_movements' && movementsData) {
      title = 'Stock_Movements_Report';
      summaryLines = [
        { label: 'Total Movements', value: String(movementsData.summary.total_movements_count) },
        { label: 'Inward Count', value: String(movementsData.summary.total_in_movements) },
        { label: 'Outward Count', value: String(movementsData.summary.total_out_movements) },
      ];
      headers = ['Date / Time', 'Product', 'Variant', 'Direction', 'Quantity', 'Reference Type', 'Notes'];
      rows = movementsData.rows.map((m) => [
        m.created_at,
        m.product_name || '—',
        m.variant_name || '—',
        m.movement_type,
        (m.quantity / 1000).toFixed(2),
        m.reference_type || '—',
        m.notes || '—',
      ]);
    } else if (activeReport === 'suppliers_payable' && suppliersData) {
      title = 'Suppliers_Payable_Report';
      summaryLines = [
        { label: 'Total Suppliers', value: String(suppliersData.summary.total_suppliers_count) },
        { label: 'Total Outstanding Payables', value: `Rs. ${(suppliersData.summary.total_payable_balance_minor / 100).toFixed(2)}` },
      ];
      headers = ['Supplier Name', 'Contact Person', 'Phone', 'Opening Balance', 'Current Payable Balance', 'Status'];
      rows = suppliersData.rows.map((s) => [
        s.name,
        s.contact_person || '—',
        s.phone || '—',
        (s.opening_balance_minor / 100).toFixed(2),
        (s.current_balance_minor / 100).toFixed(2),
        s.is_active ? 'Active' : 'Inactive',
      ]);
    } else if (activeReport === 'customers_khata' && customersData) {
      title = 'Customers_Khata_Receivables_Report';
      summaryLines = [
        { label: 'Total Customers', value: String(customersData.summary.total_customers_count) },
        { label: 'Total Khata Receivables', value: `Rs. ${(customersData.summary.total_receivable_balance_minor / 100).toFixed(2)}` },
      ];
      headers = ['Customer Name', 'Phone Number', 'Address', 'Credit Limit', 'Khata Balance', 'Status'];
      rows = customersData.rows.map((c) => [
        c.name,
        c.phone,
        c.address || '—',
        c.credit_limit_minor > 0 ? (c.credit_limit_minor / 100).toFixed(2) : 'Unlimited',
        (c.current_balance_minor / 100).toFixed(2),
        c.is_active ? 'Active' : 'Inactive',
      ]);
    } else if (activeReport === 'profit_summary' && profitData) {
      title = 'Profit_and_Margin_Summary';
      summaryLines = [
        { label: 'Total Selling Revenue', value: `Rs. ${(profitData.total_revenue_minor / 100).toFixed(2)}` },
        { label: 'Cost of Goods Sold (COGS)', value: `Rs. ${(profitData.total_cogs_minor / 100).toFixed(2)}` },
        { label: 'Gross Profit', value: `Rs. ${(profitData.total_gross_profit_minor / 100).toFixed(2)}` },
        { label: 'Gross Margin', value: `${profitData.overall_margin_percentage.toFixed(2)}%` },
      ];
      headers = ['Product', 'Variant', 'SKU', 'Units Sold', 'Revenue (PKR)', 'COGS (PKR)', 'Gross Profit (PKR)', 'Margin %'];
      rows = profitData.items.map((it) => [
        it.product_name,
        it.variant_name,
        it.sku || '—',
        (it.units_sold / 1000).toString(),
        (it.selling_revenue_minor / 100).toFixed(2),
        (it.cost_of_goods_sold_minor / 100).toFixed(2),
        (it.gross_profit_minor / 100).toFixed(2),
        `${it.margin_percentage.toFixed(2)}%`,
      ]);
    }

    set({ isExporting: true });
    try {
      const res = await window.martpos.reports.export({
        report_type: activeReport,
        format,
        title,
        filters,
        headers,
        rows,
        summaryLines,
      });

      if (res.success && !res.data.canceled) {
        showToast('success', `Report exported successfully to ${res.data.filePath ?? 'file'}`);
      }
    } finally {
      set({ isExporting: false });
    }
  },
}));
