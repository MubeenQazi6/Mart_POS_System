import { useEffect, useState } from 'react';
import { PageHeader } from '@renderer/components/ui/PageHeader';
import { Button } from '@renderer/components/ui/Button';
import { Badge } from '@renderer/components/ui/Badge';
import { LoadingState } from '@renderer/components/ui/LoadingState';
import { useReportsStore } from '@renderer/stores/reportsStore';
import { useAuthStore } from '@renderer/stores/authStore';
import type { ReportType, DatePreset } from '@shared/types/reports';
import type { LucideIcon } from 'lucide-react';
import {
  TrendingUp,
  FileSpreadsheet,
  Printer,
  Download,
  Calendar,
  DollarSign,
  Package,
  ArrowDownRight,
  ArrowUpRight,
  ShieldAlert,
  Building2,
  Users,
} from 'lucide-react';

export function ReportsPage(): React.JSX.Element {
  const {
    activeReport,
    setActiveReport,
    datePreset,
    setDatePreset,
    setFilters,
    isLoading,
    isExporting,
    loadCurrentReport,
    exportCurrentReport,
    salesData,
    purchasesData,
    inventoryData,
    movementsData,
    suppliersData,
    customersData,
    profitData,
  } = useReportsStore();

  const { can } = useAuthStore();
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  useEffect(() => {
    void loadCurrentReport();
  }, [loadCurrentReport]);

  if (!can('reports.view')) {
    return (
      <div className="p-6">
        <PageHeader title="Business Reports & Analytics" description="Financial intelligence, sales summary, and stock valuation" />
        <div className="mt-8 p-6 bg-slate-800 border border-slate-700 rounded-xl text-center flex flex-col items-center">
          <ShieldAlert className="w-12 h-12 text-amber-400 mb-3" />
          <h2 className="text-lg font-semibold text-slate-100 mb-1">Access Restricted</h2>
          <p className="text-xs text-slate-400 max-w-md">
            You do not have permission to view business reports. Please contact store management.
          </p>
        </div>
      </div>
    );
  }

  const handleCustomDateApply = (): void => {
    if (customFrom && customTo) {
      setFilters({ date_from: customFrom, date_to: customTo });
    }
  };

  const tabs: { id: ReportType; label: string; icon: LucideIcon }[] = [
    { id: 'sales', label: 'Sales Report', icon: TrendingUp },
    { id: 'purchases', label: 'Purchases Report', icon: ArrowDownRight },
    { id: 'profit_summary', label: 'Profit & Margins', icon: DollarSign },
    { id: 'inventory', label: 'Stock Valuation', icon: Package },
    { id: 'stock_movements', label: 'Stock Movements', icon: ArrowUpRight },
    { id: 'suppliers_payable', label: 'Supplier Payables', icon: Building2 },
    { id: 'customers_khata', label: 'Customer Khata', icon: Users },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title="Business Reports & Analytics"
          description="Authoritative financial, sales, inventory valuation, and ledger reports"
        />

        {/* Export Actions */}
        {can('reports.export') && (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                void exportCurrentReport('csv');
              }}
              disabled={isExporting || isLoading}
              className="gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Export CSV</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                void exportCurrentReport('xlsx');
              }}
              disabled={isExporting || isLoading}
              className="gap-1.5"
            >
              <Download className="w-4 h-4 text-blue-400" />
              <span>Excel</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                void exportCurrentReport('pdf');
              }}
              disabled={isExporting || isLoading}
              className="gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Print / PDF</span>
            </Button>
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 border-b border-slate-700 overflow-x-auto pb-px">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeReport === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveReport(tab.id);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-t border-l border-r whitespace-nowrap ${
                isActive
                  ? 'bg-slate-800 text-emerald-400 border-slate-700 border-b-transparent shadow-sm'
                  : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter Presets Bar */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-sm text-xs">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-slate-400 mr-1" />
          <span className="text-slate-400 font-medium">Period:</span>
          {(['today', 'yesterday', 'this_week', 'this_month', 'custom'] as DatePreset[]).map((preset) => (
            <button
              key={preset}
              onClick={() => {
                setDatePreset(preset);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                datePreset === preset
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-700'
              }`}
            >
              {preset === 'today'
                ? 'Today'
                : preset === 'yesterday'
                  ? 'Yesterday'
                  : preset === 'this_week'
                    ? 'This Week'
                    : preset === 'this_month'
                      ? 'This Month'
                      : 'Custom Range'}
            </button>
          ))}
        </div>

        {datePreset === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => {
                setCustomFrom(e.target.value);
              }}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
            <span className="text-slate-500">to</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => {
                setCustomTo(e.target.value);
              }}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
            <Button size="sm" variant="secondary" onClick={handleCustomDateApply}>
              Apply
            </Button>
          </div>
        )}
      </div>

      {/* REPORT CONTENT SECTIONS */}
      {isLoading ? (
        <LoadingState message="Generating authoritative report data..." />
      ) : (
        <>
          {/* 1. SALES REPORT */}
          {activeReport === 'sales' && salesData && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-sm">
                  <div className="text-slate-400 text-xs uppercase font-medium">Invoices Issued</div>
                  <div className="text-2xl font-bold font-mono text-slate-100 mt-1">
                    {salesData.summary.total_sales_count}
                  </div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-sm">
                  <div className="text-slate-400 text-xs uppercase font-medium">Net Sales Revenue</div>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                    Rs. {(salesData.summary.net_sales_minor / 100).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-sm">
                  <div className="text-slate-400 text-xs uppercase font-medium">Cash Collected</div>
                  <div className="text-2xl font-bold font-mono text-blue-400 mt-1">
                    Rs. {(salesData.summary.cash_collected_minor / 100).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-sm">
                  <div className="text-slate-400 text-xs uppercase font-medium">Khata Credit Given</div>
                  <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                    Rs. {(salesData.summary.credit_generated_minor / 100).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-900/60 text-slate-400 text-xs uppercase font-semibold border-b border-slate-700">
                      <tr>
                        <th className="py-3.5 px-4">Invoice #</th>
                        <th className="py-3.5 px-4">Date & Time</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Subtotal</th>
                        <th className="py-3.5 px-4 text-right">Discount</th>
                        <th className="py-3.5 px-4 text-right">Net Total</th>
                        <th className="py-3.5 px-4">Payment Methods</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/60 font-mono text-xs">
                      {salesData.rows.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-750/50">
                          <td className="py-3.5 px-4 font-semibold text-emerald-400">{s.invoice_number}</td>
                          <td className="py-3.5 px-4 text-slate-400">{s.created_at}</td>
                          <td className="py-3.5 px-4 font-sans">
                            <Badge variant={s.status === 'completed' ? 'success' : 'warning'}>{s.status}</Badge>
                          </td>
                          <td className="py-3.5 px-4 text-right text-slate-300">
                            {(s.subtotal_minor / 100).toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 text-right text-rose-400">
                            {s.discount_minor > 0 ? `-${(s.discount_minor / 100).toFixed(2)}` : '0.00'}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-slate-100">
                            {(s.total_minor / 100).toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 font-sans text-xs">
                            {s.payments?.map((p) => (
                              <span key={p.id} className="inline-block bg-slate-900 px-2 py-0.5 rounded border border-slate-700 mr-1.5 font-mono text-[11px]">
                                {p.payment_method}: Rs. {(p.amount_minor / 100).toFixed(2)}
                              </span>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 2. PURCHASES REPORT */}
          {activeReport === 'purchases' && purchasesData && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-sm">
                  <div className="text-slate-400 text-xs uppercase font-medium">Orders Count</div>
                  <div className="text-2xl font-bold font-mono text-slate-100 mt-1">
                    {purchasesData.summary.total_purchases_count}
                  </div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-sm">
                  <div className="text-slate-400 text-xs uppercase font-medium">Total Inward Value</div>
                  <div className="text-2xl font-bold font-mono text-slate-100 mt-1">
                    Rs. {(purchasesData.summary.total_purchases_minor / 100).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-sm">
                  <div className="text-slate-400 text-xs uppercase font-medium">Total Paid Out</div>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                    Rs. {(purchasesData.summary.total_paid_minor / 100).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-sm">
                  <div className="text-slate-400 text-xs uppercase font-medium">Payable Balance Due</div>
                  <div className="text-2xl font-bold font-mono text-rose-400 mt-1">
                    Rs. {(purchasesData.summary.total_balance_minor / 100).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-900/60 text-slate-400 text-xs uppercase font-semibold border-b border-slate-700">
                      <tr>
                        <th className="py-3.5 px-4">PO #</th>
                        <th className="py-3.5 px-4">Date</th>
                        <th className="py-3.5 px-4">Supplier</th>
                        <th className="py-3.5 px-4">Invoice #</th>
                        <th className="py-3.5 px-4 text-right">Total</th>
                        <th className="py-3.5 px-4 text-right">Paid</th>
                        <th className="py-3.5 px-4 text-right">Balance</th>
                        <th className="py-3.5 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/60 font-mono text-xs">
                      {purchasesData.rows.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-750/50">
                          <td className="py-3.5 px-4 font-semibold text-emerald-400">{p.purchase_number}</td>
                          <td className="py-3.5 px-4 text-slate-400">{p.created_at.split('T')[0]}</td>
                          <td className="py-3.5 px-4 font-sans text-slate-200">{p.supplier_name || '—'}</td>
                          <td className="py-3.5 px-4 text-slate-400">{p.supplier_invoice_number || '—'}</td>
                          <td className="py-3.5 px-4 text-right font-bold text-slate-100">
                            {(p.total_minor / 100).toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 text-right text-emerald-400">
                            {(p.paid_amount_minor / 100).toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 text-right text-rose-400">
                            {(p.balance_minor / 100).toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 font-sans">
                            <Badge variant={p.payment_status === 'paid' ? 'success' : p.payment_status === 'partial' ? 'warning' : 'danger'}>
                              {p.payment_status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 3. PROFIT SUMMARY */}
          {activeReport === 'profit_summary' && profitData && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-sm">
                  <div className="text-slate-400 text-xs uppercase font-medium">Selling Revenue</div>
                  <div className="text-2xl font-bold font-mono text-slate-100 mt-1">
                    Rs. {(profitData.total_revenue_minor / 100).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-sm">
                  <div className="text-slate-400 text-xs uppercase font-medium">Cost of Goods Sold (COGS)</div>
                  <div className="text-2xl font-bold font-mono text-rose-400 mt-1">
                    Rs. {(profitData.total_cogs_minor / 100).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-sm">
                  <div className="text-slate-400 text-xs uppercase font-medium">Gross Profit</div>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                    Rs. {(profitData.total_gross_profit_minor / 100).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-sm">
                  <div className="text-slate-400 text-xs uppercase font-medium">Overall Gross Margin</div>
                  <div className="text-2xl font-bold font-mono text-blue-400 mt-1">
                    {profitData.overall_margin_percentage.toFixed(2)}%
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-900/60 text-slate-400 text-xs uppercase font-semibold border-b border-slate-700">
                      <tr>
                        <th className="py-3.5 px-4">Product Name</th>
                        <th className="py-3.5 px-4">Variant</th>
                        <th className="py-3.5 px-4">SKU</th>
                        <th className="py-3.5 px-4 text-right">Units Sold</th>
                        <th className="py-3.5 px-4 text-right">Revenue (PKR)</th>
                        <th className="py-3.5 px-4 text-right">COGS (PKR)</th>
                        <th className="py-3.5 px-4 text-right">Gross Profit (PKR)</th>
                        <th className="py-3.5 px-4 text-right">Margin %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/60 font-mono text-xs">
                      {profitData.items.map((it) => (
                        <tr key={it.variant_id} className="hover:bg-slate-750/50">
                          <td className="py-3.5 px-4 font-sans font-medium text-slate-100">{it.product_name}</td>
                          <td className="py-3.5 px-4 text-slate-300">{it.variant_name}</td>
                          <td className="py-3.5 px-4 text-slate-400">{it.sku || '—'}</td>
                          <td className="py-3.5 px-4 text-right text-slate-200">{(it.units_sold / 1000).toString()}</td>
                          <td className="py-3.5 px-4 text-right text-slate-100">{(it.selling_revenue_minor / 100).toFixed(2)}</td>
                          <td className="py-3.5 px-4 text-right text-slate-400">{(it.cost_of_goods_sold_minor / 100).toFixed(2)}</td>
                          <td className="py-3.5 px-4 text-right font-bold text-emerald-400">
                            {(it.gross_profit_minor / 100).toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-blue-400">{it.margin_percentage.toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 4. INVENTORY VALUATION */}
          {activeReport === 'inventory' && inventoryData && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-sm">
                  <div className="text-slate-400 text-xs uppercase font-medium">Catalog Variants</div>
                  <div className="text-2xl font-bold font-mono text-slate-100 mt-1">
                    {inventoryData.summary.total_items_count}
                  </div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-sm">
                  <div className="text-slate-400 text-xs uppercase font-medium">Total Purchase Valuation</div>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                    Rs. {(inventoryData.summary.total_valuation_purchase_minor / 100).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-sm">
                  <div className="text-slate-400 text-xs uppercase font-medium">Total Retail Valuation</div>
                  <div className="text-2xl font-bold font-mono text-blue-400 mt-1">
                    Rs. {(inventoryData.summary.total_valuation_retail_minor / 100).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-sm">
                  <div className="text-slate-400 text-xs uppercase font-medium">Low / Out of Stock</div>
                  <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                    {inventoryData.summary.total_low_stock_items} / {inventoryData.summary.total_out_of_stock_items}
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-900/60 text-slate-400 text-xs uppercase font-semibold border-b border-slate-700">
                      <tr>
                        <th className="py-3.5 px-4">Product Name</th>
                        <th className="py-3.5 px-4">Variant</th>
                        <th className="py-3.5 px-4">Category</th>
                        <th className="py-3.5 px-4 text-right">Current Stock</th>
                        <th className="py-3.5 px-4 text-right">Unit Cost</th>
                        <th className="py-3.5 px-4 text-right">Retail Price</th>
                        <th className="py-3.5 px-4 text-right">Purchase Value</th>
                        <th className="py-3.5 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/60 font-mono text-xs">
                      {inventoryData.rows.map((row) => (
                        <tr key={row.variant_id} className="hover:bg-slate-750/50">
                          <td className="py-3.5 px-4 font-sans font-medium text-slate-100">{row.product_name}</td>
                          <td className="py-3.5 px-4 text-slate-300">{row.variant_name}</td>
                          <td className="py-3.5 px-4 font-sans text-slate-400">{row.category_name || '—'}</td>
                          <td className="py-3.5 px-4 text-right font-bold text-slate-100">
                            {(row.current_stock / 1000).toFixed(row.unit_decimals || 0)} {row.unit_abbreviation}
                          </td>
                          <td className="py-3.5 px-4 text-right text-slate-400">
                            {(row.purchase_price_minor / 100).toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 text-right text-slate-300">
                            {((row.selling_price_minor ?? 0) / 100).toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-emerald-400">
                            {((row.current_stock * row.purchase_price_minor) / 100000).toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 font-sans">
                            <Badge variant={row.stock_status === 'in_stock' ? 'success' : row.stock_status === 'low_stock' ? 'warning' : 'danger'}>
                              {row.stock_status.replace('_', ' ')}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 5. STOCK MOVEMENTS */}
          {activeReport === 'stock_movements' && movementsData && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-sm">
                  <div className="text-slate-400 text-xs uppercase font-medium">Total Movement Records</div>
                  <div className="text-2xl font-bold font-mono text-slate-100 mt-1">{movementsData.summary.total_movements_count}</div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-sm">
                  <div className="text-slate-400 text-xs uppercase font-medium">Inward Operations</div>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{movementsData.summary.total_in_movements}</div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-sm">
                  <div className="text-slate-400 text-xs uppercase font-medium">Outward Operations</div>
                  <div className="text-2xl font-bold font-mono text-rose-400 mt-1">{movementsData.summary.total_out_movements}</div>
                </div>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-900/60 text-slate-400 text-xs uppercase font-semibold border-b border-slate-700">
                      <tr>
                        <th className="py-3.5 px-4">Date & Time</th>
                        <th className="py-3.5 px-4">Product</th>
                        <th className="py-3.5 px-4">Variant</th>
                        <th className="py-3.5 px-4">Type</th>
                        <th className="py-3.5 px-4 text-right">Quantity</th>
                        <th className="py-3.5 px-4">Reference</th>
                        <th className="py-3.5 px-4">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/60 font-mono text-xs">
                      {movementsData.rows.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-750/50">
                          <td className="py-3.5 px-4 text-slate-400">{m.created_at}</td>
                          <td className="py-3.5 px-4 font-sans font-medium text-slate-100">{m.product_name}</td>
                          <td className="py-3.5 px-4 text-slate-300">{m.variant_name}</td>
                          <td className="py-3.5 px-4 font-sans">
                            <Badge variant={m.movement_type === 'IN' ? 'success' : 'danger'}>{m.movement_type}</Badge>
                          </td>
                          <td className={`py-3.5 px-4 text-right font-bold ${m.movement_type === 'IN' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {m.movement_type === 'IN' ? '+' : '-'}{(m.quantity / 1000).toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 text-slate-300 font-semibold">{m.reference_type}</td>
                          <td className="py-3.5 px-4 font-sans text-slate-400 max-w-xs truncate">{m.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 6. SUPPLIERS PAYABLE */}
          {activeReport === 'suppliers_payable' && suppliersData && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-sm">
                  <div className="text-slate-400 text-xs uppercase font-medium">Registered Suppliers</div>
                  <div className="text-2xl font-bold font-mono text-slate-100 mt-1">{suppliersData.summary.total_suppliers_count}</div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-sm">
                  <div className="text-slate-400 text-xs uppercase font-medium">Total Payables Outstanding</div>
                  <div className="text-2xl font-bold font-mono text-rose-400 mt-1">
                    Rs. {(suppliersData.summary.total_payable_balance_minor / 100).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-900/60 text-slate-400 text-xs uppercase font-semibold border-b border-slate-700">
                      <tr>
                        <th className="py-3.5 px-4">Supplier Name</th>
                        <th className="py-3.5 px-4">Contact Person</th>
                        <th className="py-3.5 px-4">Phone</th>
                        <th className="py-3.5 px-4 text-right">Opening Balance</th>
                        <th className="py-3.5 px-4 text-right">Current Payable Balance</th>
                        <th className="py-3.5 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/60 font-mono text-xs">
                      {suppliersData.rows.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-750/50">
                          <td className="py-3.5 px-4 font-sans font-medium text-slate-100">{s.name}</td>
                          <td className="py-3.5 px-4 font-sans text-slate-300">{s.contact_person || '—'}</td>
                          <td className="py-3.5 px-4 text-slate-400">{s.phone || '—'}</td>
                          <td className="py-3.5 px-4 text-right text-slate-400">{(s.opening_balance_minor / 100).toFixed(2)}</td>
                          <td className="py-3.5 px-4 text-right font-bold text-rose-400">{(s.current_balance_minor / 100).toFixed(2)}</td>
                          <td className="py-3.5 px-4 font-sans">
                            <Badge variant={s.is_active ? 'success' : 'neutral'}>{s.is_active ? 'Active' : 'Inactive'}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 7. CUSTOMERS KHATA */}
          {activeReport === 'customers_khata' && customersData && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-sm">
                  <div className="text-slate-400 text-xs uppercase font-medium">Khata Customers</div>
                  <div className="text-2xl font-bold font-mono text-slate-100 mt-1">{customersData.summary.total_customers_count}</div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-sm">
                  <div className="text-slate-400 text-xs uppercase font-medium">Total Khata Receivables</div>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                    Rs. {(customersData.summary.total_receivable_balance_minor / 100).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-sm">
                  <div className="text-slate-400 text-xs uppercase font-medium">Total Credit Limit Extended</div>
                  <div className="text-2xl font-bold font-mono text-slate-300 mt-1">
                    Rs. {(customersData.summary.total_credit_limit_minor / 100).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-900/60 text-slate-400 text-xs uppercase font-semibold border-b border-slate-700">
                      <tr>
                        <th className="py-3.5 px-4">Customer Name</th>
                        <th className="py-3.5 px-4">Phone</th>
                        <th className="py-3.5 px-4">Address</th>
                        <th className="py-3.5 px-4 text-right">Credit Limit</th>
                        <th className="py-3.5 px-4 text-right">Current Khata Debt</th>
                        <th className="py-3.5 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/60 font-mono text-xs">
                      {customersData.rows.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-750/50">
                          <td className="py-3.5 px-4 font-sans font-medium text-slate-100">{c.name}</td>
                          <td className="py-3.5 px-4 text-emerald-400">{c.phone}</td>
                          <td className="py-3.5 px-4 font-sans text-slate-400">{c.address || '—'}</td>
                          <td className="py-3.5 px-4 text-right text-slate-400">
                            {c.credit_limit_minor > 0 ? (c.credit_limit_minor / 100).toFixed(2) : 'Unlimited'}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-amber-400">
                            {(c.current_balance_minor / 100).toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 font-sans">
                            <Badge variant={c.is_active ? 'success' : 'neutral'}>{c.is_active ? 'Active' : 'Inactive'}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
