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
    error,
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

  // Load report on mount and when dependencies change
  useEffect(() => {
    void loadCurrentReport();
  }, [loadCurrentReport]);

  if (!can('reports.view')) {
    return (
      <div className="p-6">
        <PageHeader
          title="Business Reports & Analytics"
          description="Financial intelligence, sales summary, and stock valuation"
        />
        <div className="mt-8 p-6 bg-white border border-surface-border rounded-xl text-center flex flex-col items-center shadow-xs dark:bg-slate-900 dark:border-slate-800">
          <ShieldAlert className="w-12 h-12 text-amber-500 mb-3 dark:text-amber-400" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
            Access Restricted
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
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

  const renderReportContent = (): React.JSX.Element | null => {
    if (isLoading) {
      return <LoadingState message="Generating report data..." />;
    }
    if (error) {
      return (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
        >
          {error}
        </div>
      );
    }

    switch (activeReport) {
      case 'sales':
        if (!salesData)
          return (
            <EmptyState
              title="No Sales Data"
              description="No sales records found for the selected period."
              icon={TrendingUp}
            />
          );
        return <SalesReport data={salesData} />;
      case 'purchases':
        if (!purchasesData)
          return (
            <EmptyState
              title="No Purchases Data"
              description="No purchase records found for the selected period."
              icon={ArrowDownRight}
            />
          );
        return <PurchasesReport data={purchasesData} />;
      case 'profit_summary':
        if (!profitData)
          return (
            <EmptyState
              title="No Profit Data"
              description="No profit data available for the selected period."
              icon={DollarSign}
            />
          );
        return <ProfitReport data={profitData} />;
      case 'inventory':
        if (!inventoryData)
          return (
            <EmptyState
              title="No Inventory Data"
              description="No inventory records found."
              icon={Package}
            />
          );
        return <InventoryReport data={inventoryData} />;
      case 'stock_movements':
        if (!movementsData)
          return (
            <EmptyState
              title="No Stock Movements"
              description="No stock movement records found for the selected period."
              icon={ArrowUpRight}
            />
          );
        return <MovementsReport data={movementsData} />;
      case 'suppliers_payable':
        if (!suppliersData)
          return (
            <EmptyState
              title="No Supplier Data"
              description="No supplier records found."
              icon={Building2}
            />
          );
        return <SuppliersReport data={suppliersData} />;
      case 'customers_khata':
        if (!customersData)
          return (
            <EmptyState
              title="No Customer Data"
              description="No customer khata records found."
              icon={Users}
            />
          );
        return <CustomersReport data={customersData} />;
      default:
        return (
          <EmptyState
            title="Select a Report"
            description="Choose a report from the tabs above."
            icon={TrendingUp}
          />
        );
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title="Business Reports & Analytics"
          description="Authoritative financial, sales, inventory valuation, and ledger reports"
        />

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
              <FileSpreadsheet className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
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
              <Download className="w-4 h-4 text-blue-500 dark:text-blue-400" />
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
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-700 overflow-x-auto pb-px">
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
                  ? 'bg-white text-brand-600 border-slate-200 border-b-transparent shadow-sm dark:bg-slate-800 dark:text-brand-400 dark:border-slate-700'
                  : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/40'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter Presets Bar */}
      <div className="bg-white border border-surface-border rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs dark:bg-slate-900 dark:border-slate-700 text-xs">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-slate-400 mr-1" />
          <span className="text-slate-500 dark:text-slate-400 font-medium">Period:</span>
          {(['today', 'yesterday', 'this_week', 'this_month', 'custom'] as DatePreset[]).map(
            (preset) => (
              <button
                key={preset}
                onClick={() => {
                  setDatePreset(preset);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  datePreset === preset
                    ? 'bg-brand-500/10 text-brand-600 border border-brand-500/40 font-semibold dark:bg-brand-500/20 dark:text-brand-400'
                    : 'bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-200 dark:border-slate-700'
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
            ),
          )}
        </div>

        {datePreset === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-brand-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:focus:border-brand-500"
            />
            <span className="text-slate-500 dark:text-slate-400">to</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-brand-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:focus:border-brand-500"
            />
            <Button size="sm" variant="secondary" onClick={handleCustomDateApply}>
              Apply
            </Button>
          </div>
        )}
      </div>

      {/* Report Content */}
      {renderReportContent()}
    </div>
  );
}

// ============== Helper Components ==============

function EmptyState({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}): React.JSX.Element {
  return (
    <div className="bg-white border border-surface-border rounded-xl p-12 text-center dark:bg-slate-900 dark:border-slate-700">
      <Icon className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{description}</p>
    </div>
  );
}

function KpiCard({
  label,
  value,
  color = 'slate',
}: {
  label: string;
  value: string | number;
  color?: string;
}): React.JSX.Element {
  const colorMap: Record<string, string> = {
    slate: 'text-slate-900 dark:text-slate-100',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    blue: 'text-blue-600 dark:text-blue-400',
    amber: 'text-amber-600 dark:text-amber-400',
    rose: 'text-rose-600 dark:text-rose-400',
  };
  return (
    <div className="bg-white border border-surface-border rounded-xl p-4 shadow-xs dark:bg-slate-900 dark:border-slate-700">
      <div className="text-slate-500 dark:text-slate-400 text-xs uppercase font-medium">
        {label}
      </div>
      <div className={`text-2xl font-bold font-mono mt-1 ${colorMap[color] || colorMap.slate}`}>
        {value}
      </div>
    </div>
  );
}

export type ColumnHeader =
  | string
  | {
      label: string;
      align?: 'left' | 'center' | 'right';
      className?: string;
    };

function getHeaderAlignment(header: ColumnHeader): 'left' | 'center' | 'right' {
  if (typeof header === 'object' && header.align) {
    return header.align;
  }
  const label = typeof header === 'string' ? header : header.label;
  const lower = label.toLowerCase();
  if (
    lower.includes('total') ||
    lower.includes('subtotal') ||
    lower.includes('discount') ||
    lower.includes('paid') ||
    lower.includes('balance') ||
    lower.includes('price') ||
    lower.includes('cost') ||
    lower.includes('revenue') ||
    lower.includes('cogs') ||
    lower.includes('profit') ||
    lower.includes('margin') ||
    lower.includes('stock') ||
    lower.includes('quantity') ||
    lower.includes('limit') ||
    lower.includes('debt') ||
    lower.includes('value') ||
    lower.includes('sold')
  ) {
    return 'right';
  }
  if (lower === 'status' || lower === 'type') {
    return 'center';
  }
  return 'left';
}

function ReportTable({
  headers,
  rows,
  renderRow,
}: {
  headers: ColumnHeader[];
  rows: any[];
  renderRow: (row: any) => React.JSX.Element;
}): React.JSX.Element {
  return (
    <div className="bg-white border border-surface-border rounded-xl overflow-hidden shadow-xs dark:bg-slate-900 dark:border-slate-700">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700">
            <tr>
              {headers.map((header, index) => {
                const label = typeof header === 'string' ? header : header.label;
                const align = getHeaderAlignment(header);
                const alignClass =
                  align === 'right'
                    ? 'text-right'
                    : align === 'center'
                      ? 'text-center'
                      : 'text-left';
                const customClass = typeof header === 'object' ? header.className || '' : '';

                return (
                  <th
                    key={index}
                    className={`py-3.5 px-4 font-semibold ${alignClass} ${customClass}`}
                  >
                    {label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {rows.map((row, index) => (
              <tr
                key={index}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                {renderRow(row)}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400">
            No data available for this report.
          </div>
        )}
      </div>
    </div>
  );
}

function formatMoney(value: number): string {
  return `Rs. ${(value / 100).toFixed(2)}`;
}

// ============== Report Components ==============

function SalesReport({ data }: { data: any }): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Invoices Issued" value={data.summary?.total_sales_count || 0} />
        <KpiCard
          label="Net Sales Revenue"
          value={formatMoney(data.summary?.net_sales_minor || 0)}
          color="emerald"
        />
        <KpiCard
          label="Cash Collected"
          value={formatMoney(data.summary?.cash_collected_minor || 0)}
          color="blue"
        />
        <KpiCard
          label="Khata Credit Given"
          value={formatMoney(data.summary?.credit_generated_minor || 0)}
          color="amber"
        />
      </div>
      <ReportTable
        headers={[
          'Invoice #',
          'Date & Time',
          'Status',
          'Subtotal',
          'Discount',
          'Net Total',
          'Payment Methods',
        ]}
        rows={data.rows || []}
        renderRow={(row) => (
          <>
            <td className="py-3.5 px-4 font-semibold text-brand-600 dark:text-brand-400 whitespace-nowrap">
              {row.invoice_number}
            </td>
            <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">{row.created_at}</td>
            <td className="py-3.5 px-4 text-center">
              <Badge variant={row.status === 'completed' ? 'success' : 'warning'}>
                {row.status}
              </Badge>
            </td>
            <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap text-slate-700 dark:text-slate-300">
              {formatMoney(row.subtotal_minor)}
            </td>
            <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap text-rose-500 dark:text-rose-400">
              {row.discount_minor > 0 ? `-${formatMoney(row.discount_minor)}` : '0.00'}
            </td>
            <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap font-bold text-slate-900 dark:text-slate-100">
              {formatMoney(row.total_minor)}
            </td>
            <td className="py-3.5 px-4 font-sans text-xs">
              {row.payments?.map((p: any) => (
                <span
                  key={p.id}
                  className="inline-block bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 mr-1.5 text-[11px] whitespace-nowrap font-mono"
                >
                  {p.payment_method}: {formatMoney(p.amount_minor)}
                </span>
              ))}
            </td>
          </>
        )}
      />
    </div>
  );
}

function PurchasesReport({ data }: { data: any }): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Orders Count" value={data.summary?.total_purchases_count || 0} />
        <KpiCard
          label="Total Inward Value"
          value={formatMoney(data.summary?.total_purchases_minor || 0)}
        />
        <KpiCard
          label="Total Paid Out"
          value={formatMoney(data.summary?.total_paid_minor || 0)}
          color="emerald"
        />
        <KpiCard
          label="Payable Balance Due"
          value={formatMoney(data.summary?.total_balance_minor || 0)}
          color="rose"
        />
      </div>
      <ReportTable
        headers={['PO #', 'Date', 'Supplier', 'Invoice #', 'Total', 'Paid', 'Balance', 'Status']}
        rows={data.rows || []}
        renderRow={(row) => (
          <>
            <td className="py-3.5 px-4 font-semibold text-brand-600 dark:text-brand-400 whitespace-nowrap">
              {row.purchase_number}
            </td>
            <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
              {row.created_at?.split('T')[0]}
            </td>
            <td className="py-3.5 px-4 font-sans text-slate-800 dark:text-slate-200">
              {row.supplier_name || '—'}
            </td>
            <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
              {row.supplier_invoice_number || '—'}
            </td>
            <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap font-bold text-slate-900 dark:text-slate-100">
              {formatMoney(row.total_minor)}
            </td>
            <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap text-emerald-600 dark:text-emerald-400">
              {formatMoney(row.paid_amount_minor)}
            </td>
            <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap text-rose-600 dark:text-rose-400">
              {formatMoney(row.balance_minor)}
            </td>
            <td className="py-3.5 px-4 text-center">
              <Badge
                variant={
                  row.payment_status === 'paid'
                    ? 'success'
                    : row.payment_status === 'partial'
                      ? 'warning'
                      : 'danger'
                }
              >
                {row.payment_status}
              </Badge>
            </td>
          </>
        )}
      />
    </div>
  );
}

function ProfitReport({ data }: { data: any }): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Selling Revenue" value={formatMoney(data.total_revenue_minor || 0)} />
        <KpiCard
          label="Cost of Goods Sold"
          value={formatMoney(data.total_cogs_minor || 0)}
          color="rose"
        />
        <KpiCard
          label="Gross Profit"
          value={formatMoney(data.total_gross_profit_minor || 0)}
          color="emerald"
        />
        <KpiCard
          label="Overall Gross Margin"
          value={`${(data.overall_margin_percentage || 0).toFixed(2)}%`}
          color="blue"
        />
      </div>
      <ReportTable
        headers={[
          'Product',
          'Variant',
          'SKU',
          'Units Sold',
          'Revenue',
          'COGS',
          'Gross Profit',
          'Margin %',
        ]}
        rows={data.items || []}
        renderRow={(row) => (
          <>
            <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-slate-100">
              {row.product_name}
            </td>
            <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">{row.variant_name}</td>
            <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono">{row.sku || '—'}</td>
            <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap text-slate-700 dark:text-slate-300">
              {(row.units_sold / 1000).toString()}
            </td>
            <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap text-slate-900 dark:text-slate-100">
              {formatMoney(row.selling_revenue_minor)}
            </td>
            <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap text-slate-500 dark:text-slate-400">
              {formatMoney(row.cost_of_goods_sold_minor)}
            </td>
            <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap font-bold text-emerald-600 dark:text-emerald-400">
              {formatMoney(row.gross_profit_minor)}
            </td>
            <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap font-bold text-blue-600 dark:text-blue-400">
              {row.margin_percentage.toFixed(2)}%
            </td>
          </>
        )}
      />
    </div>
  );
}

function InventoryReport({ data }: { data: any }): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Catalog Variants" value={data.summary?.total_items_count || 0} />
        <KpiCard
          label="Total Purchase Valuation"
          value={formatMoney(data.summary?.total_valuation_purchase_minor || 0)}
          color="emerald"
        />
        <KpiCard
          label="Total Retail Valuation"
          value={formatMoney(data.summary?.total_valuation_retail_minor || 0)}
          color="blue"
        />
        <KpiCard
          label="Low / Out of Stock"
          value={`${data.summary?.total_low_stock_items || 0} / ${data.summary?.total_out_of_stock_items || 0}`}
          color="amber"
        />
      </div>
      <ReportTable
        headers={[
          'Product',
          'Variant',
          'Category',
          'Current Stock',
          'Unit Cost',
          'Retail Price',
          'Purchase Value',
          'Status',
        ]}
        rows={data.rows || []}
        renderRow={(row) => (
          <>
            <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-slate-100">
              {row.product_name}
            </td>
            <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">{row.variant_name}</td>
            <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
              {row.category_name || '—'}
            </td>
            <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap font-bold text-slate-900 dark:text-slate-100">
              {(row.current_stock / 1000).toFixed(row.unit_decimals || 0)} {row.unit_abbreviation}
            </td>
            <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap text-slate-500 dark:text-slate-400">
              {formatMoney(row.purchase_price_minor)}
            </td>
            <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap text-slate-700 dark:text-slate-300">
              {formatMoney(row.selling_price_minor || 0)}
            </td>
            <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap font-bold text-emerald-600 dark:text-emerald-400">
              {formatMoney((row.current_stock * row.purchase_price_minor) / 1000)}
            </td>
            <td className="py-3.5 px-4 text-center">
              <Badge
                variant={
                  row.stock_status === 'in_stock'
                    ? 'success'
                    : row.stock_status === 'low_stock'
                      ? 'warning'
                      : 'danger'
                }
              >
                {row.stock_status?.replace('_', ' ') || 'Unknown'}
              </Badge>
            </td>
          </>
        )}
      />
    </div>
  );
}

function MovementsReport({ data }: { data: any }): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard label="Total Movement Records" value={data.summary?.total_movements_count || 0} />
        <KpiCard
          label="Inward Operations"
          value={data.summary?.total_in_movements || 0}
          color="emerald"
        />
        <KpiCard
          label="Outward Operations"
          value={data.summary?.total_out_movements || 0}
          color="rose"
        />
      </div>
      <ReportTable
        headers={['Date & Time', 'Product', 'Variant', 'Type', 'Quantity', 'Reference', 'Notes']}
        rows={data.rows || []}
        renderRow={(row) => (
          <>
            <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">{row.created_at}</td>
            <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-slate-100">
              {row.product_name}
            </td>
            <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">{row.variant_name}</td>
            <td className="py-3.5 px-4 text-center">
              <Badge variant={row.movement_type === 'IN' ? 'success' : 'danger'}>
                {row.movement_type}
              </Badge>
            </td>
            <td
              className={`py-3.5 px-4 text-right font-mono whitespace-nowrap font-bold ${row.movement_type === 'IN' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
            >
              {row.movement_type === 'IN' ? '+' : '-'}
              {(row.quantity / 1000).toFixed(2)}
            </td>
            <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-semibold whitespace-nowrap">
              {row.reference_type}
            </td>
            <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 max-w-xs truncate">
              {row.notes || '—'}
            </td>
          </>
        )}
      />
    </div>
  );
}

function SuppliersReport({ data }: { data: any }): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <KpiCard label="Registered Suppliers" value={data.summary?.total_suppliers_count || 0} />
        <KpiCard
          label="Total Payables Outstanding"
          value={formatMoney(data.summary?.total_payable_balance_minor || 0)}
          color="rose"
        />
      </div>
      <ReportTable
        headers={[
          'Supplier Name',
          'Contact Person',
          'Phone',
          'Opening Balance',
          'Current Payable Balance',
          'Status',
        ]}
        rows={data.rows || []}
        renderRow={(row) => (
          <>
            <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-slate-100">
              {row.name}
            </td>
            <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
              {row.contact_person || '—'}
            </td>
            <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">{row.phone || '—'}</td>
            <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap text-slate-500 dark:text-slate-400">
              {formatMoney(row.opening_balance_minor)}
            </td>
            <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap font-bold text-rose-600 dark:text-rose-400">
              {formatMoney(row.current_balance_minor)}
            </td>
            <td className="py-3.5 px-4 text-center">
              <Badge variant={row.is_active ? 'success' : 'neutral'}>
                {row.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </td>
          </>
        )}
      />
    </div>
  );
}

function CustomersReport({ data }: { data: any }): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard label="Khata Customers" value={data.summary?.total_customers_count || 0} />
        <KpiCard
          label="Total Khata Receivables"
          value={formatMoney(data.summary?.total_receivable_balance_minor || 0)}
          color="emerald"
        />
        <KpiCard
          label="Total Credit Limit Extended"
          value={formatMoney(data.summary?.total_credit_limit_minor || 0)}
        />
      </div>
      <ReportTable
        headers={[
          'Customer Name',
          'Phone',
          'Address',
          'Credit Limit',
          'Current Khata Debt',
          'Status',
        ]}
        rows={data.rows || []}
        renderRow={(row) => (
          <>
            <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-slate-100">
              {row.name}
            </td>
            <td className="py-3.5 px-4 text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{row.phone}</td>
            <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">{row.address || '—'}</td>
            <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap text-slate-500 dark:text-slate-400">
              {row.credit_limit_minor > 0 ? formatMoney(row.credit_limit_minor) : 'Unlimited'}
            </td>
            <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap font-bold text-amber-600 dark:text-amber-400">
              {formatMoney(row.current_balance_minor)}
            </td>
            <td className="py-3.5 px-4 text-center">
              <Badge variant={row.is_active ? 'success' : 'neutral'}>
                {row.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </td>
          </>
        )}
      />
    </div>
  );
}
