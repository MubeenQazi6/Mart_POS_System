import { useEffect, useState } from 'react';
import { PageHeader } from '@renderer/components/ui/PageHeader';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@renderer/components/ui/Card';
import { EmptyState } from '@renderer/components/ui/EmptyState';
import { Button } from '@renderer/components/ui/Button';
import { formatMoney } from '@shared/utils/money';
import type {
  DashboardKpis,
  DashboardSalesTrendPoint,
  DashboardTopProduct,
  DashboardActivityItem,
} from '@shared/types/dashboard';
import {
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  Boxes,
  TrendingUp,
  PackageX,
  Award,
  Activity,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Building2,
  Users,
  RotateCcw,
  Receipt,
} from 'lucide-react';

export function DashboardPage(): React.JSX.Element {
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [salesTrend, setSalesTrend] = useState<DashboardSalesTrendPoint[]>([]);
  const [topProducts, setTopProducts] = useState<DashboardTopProduct[]>([]);
  const [recentActivity, setRecentActivity] = useState<DashboardActivityItem[]>([]);
  const [isLoadingKpis, setIsLoadingKpis] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const loadDashboard = async (): Promise<void> => {
      if (!window.martpos) return;
      setIsLoadingKpis(true);
      try {
        const [kpisRes, trendRes, topProductsRes, activityRes] = await Promise.all([
          window.martpos.dashboard.getKpis({ preset: 'this_month' }),
          window.martpos.dashboard.getTrend({ preset: 'this_month' }),
          window.martpos.dashboard.getTopProducts({ preset: 'this_month', limit: 5 }),
          window.martpos.dashboard.getActivity(5),
        ]);
        if (kpisRes.success) setKpis(kpisRes.data);
        if (trendRes.success) setSalesTrend(trendRes.data);
        if (topProductsRes.success) setTopProducts(topProductsRes.data);
        if (activityRes.success) setRecentActivity(activityRes.data);
      } finally {
        setIsLoadingKpis(false);
      }
    };

    void loadDashboard();
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Dashboard"
        description="Real-time mart performance metrics and operational overview."
      />

      {/* TOP 4 PRIMARY KPI CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Today's Sales */}
        <Card className="border-l-4 border-l-brand-600">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Today&apos;s Sales
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400 shadow-xs">
                <DollarSign className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>
            <div className="mt-3">
              {isLoadingKpis ? (
                <div className="h-8 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              ) : kpis !== null ? (
                <>
                  <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    {formatMoney(kpis.today_sales_revenue_minor)}
                  </p>
                  <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {String(kpis.today_sales_invoice_count)} completed invoice(s) today
                  </p>
                </>
              ) : (
                <p className="text-2xl font-bold tracking-tight text-slate-400 italic">
                  No data yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 2. Today's Transactions / Monthly Volume */}
        <Card className="border-l-4 border-l-indigo-600">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                This Month&apos;s Volume
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 shadow-xs">
                <ShoppingCart className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>
            <div className="mt-3">
              {isLoadingKpis ? (
                <div className="h-8 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              ) : kpis !== null ? (
                <>
                  <p className="text-2xl font-black tracking-tight text-indigo-600 dark:text-indigo-400">
                    {formatMoney(kpis.sales_revenue_minor)}
                  </p>
                  <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {String(kpis.sales_invoice_count)} total invoice(s) this month
                  </p>
                </>
              ) : (
                <p className="text-2xl font-bold tracking-tight text-slate-400 italic">
                  No data yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 3. Inventory Value */}
        <Card className="border-l-4 border-l-emerald-600">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Inventory Value
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 shadow-xs">
                <Boxes className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>
            <div className="mt-3">
              {isLoadingKpis ? (
                <div className="h-8 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              ) : kpis !== null ? (
                <>
                  <p className="text-2xl font-black tracking-tight text-emerald-700 dark:text-emerald-400">
                    {formatMoney(kpis.inventory_value_minor)}
                  </p>
                  <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {String(kpis.active_product_count)} active catalog item(s)
                  </p>
                </>
              ) : (
                <p className="text-2xl font-bold tracking-tight text-slate-400 italic">—</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 4. Low Stock / Out of Stock Alerts */}
        <Card
          className={`border-l-4 ${kpis && kpis.low_stock_count > 0 ? 'border-l-amber-500' : 'border-l-slate-400'}`}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Stock Alerts
              </span>
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-xs ${
                  kpis && kpis.low_stock_count > 0
                    ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>
            <div className="mt-3">
              {isLoadingKpis ? (
                <div className="h-8 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              ) : kpis !== null ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <p
                      className={`text-2xl font-black tracking-tight ${kpis.low_stock_count > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-200'}`}
                    >
                      {String(kpis.low_stock_count)}
                    </p>
                    <span className="text-xs font-semibold text-slate-400">low stock</span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-rose-500 dark:text-rose-400">
                    {String(kpis.out_of_stock_count)} out of stock item(s)
                  </p>
                </>
              ) : (
                <p className="text-2xl font-bold tracking-tight text-slate-400 italic">—</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* VIEW MORE TOGGLE BUTTON */}
      <div className="flex items-center justify-center pt-1 pb-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setIsExpanded(!isExpanded);
          }}
          className="border-brand-200 bg-white hover:bg-brand-50/50 text-brand-700 dark:bg-slate-900 dark:border-slate-800 dark:text-brand-400 dark:hover:bg-slate-800/80 shadow-xs gap-2 px-4 py-2"
        >
          <span>{isExpanded ? 'Hide Additional Metrics' : 'View More Operational Metrics'}</span>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {/* EXPANDABLE SECONDARY KPI SECTION */}
      {isExpanded && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Purchases This Month */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Purchases This Month
                  </span>
                  <Receipt className="h-4 w-4 text-slate-400" />
                </div>
                <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                  {kpis ? formatMoney(kpis.purchases_amount_minor) : '—'}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {kpis
                    ? `${String(kpis.purchases_invoice_count)} purchase invoice(s)`
                    : 'Loading...'}
                </p>
                {kpis && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Today: {formatMoney(kpis.today_purchases_amount_minor)} (
                    {String(kpis.today_purchases_invoice_count)})
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Gross Profit */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Gross Profit (Sales Less Cost)
                  </span>
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                </div>
                <p className="mt-2 text-2xl font-black text-emerald-700 dark:text-emerald-400">
                  {kpis ? formatMoney(kpis.gross_profit_minor) : '—'}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Calculated from sale-time cost records
                </p>
              </CardContent>
            </Card>

            {/* Operating Expenses */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Expenses This Month
                  </span>
                  <CreditCard className="h-4 w-4 text-rose-500" />
                </div>
                <p className="mt-2 text-2xl font-black text-rose-700 dark:text-rose-400">
                  {kpis ? formatMoney(kpis.expenses_minor) : '—'}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Posted operating expenses
                </p>
              </CardContent>
            </Card>

            {/* Customer Receivables (Khata) */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Customer Receivables
                  </span>
                  <Users className="h-4 w-4 text-amber-500" />
                </div>
                <p className="mt-2 text-2xl font-black text-amber-700 dark:text-amber-400">
                  {kpis ? formatMoney(kpis.customer_receivables_minor) : '—'}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {kpis
                    ? `${String(kpis.active_customer_count)} active customer account(s)`
                    : 'Loading...'}
                </p>
              </CardContent>
            </Card>

            {/* Supplier Payables */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Supplier Payables
                  </span>
                  <Building2 className="h-4 w-4 text-orange-500" />
                </div>
                <p className="mt-2 text-2xl font-black text-orange-700 dark:text-orange-400">
                  {kpis ? formatMoney(kpis.supplier_payables_minor) : '—'}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {kpis
                    ? `${String(kpis.active_supplier_count)} active supplier account(s)`
                    : 'Loading...'}
                </p>
              </CardContent>
            </Card>

            {/* Returns This Month */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Returns This Month
                  </span>
                  <RotateCcw className="h-4 w-4 text-rose-500" />
                </div>
                <p className="mt-2 text-2xl font-black text-rose-700 dark:text-rose-400">
                  {kpis ? formatMoney(kpis.returns_amount_minor) : '—'}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {kpis ? `${String(kpis.returns_count)} processed return(s)` : 'Loading...'}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* DASHBOARD ACTIVITY & PERFORMANCE WIDGETS */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sales Overview Trend */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-brand-600 dark:text-brand-400" />
              <div>
                <CardTitle>Sales Trend</CardTitle>
                <CardDescription>
                  Daily revenue trends and completed transaction density
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {salesTrend.length > 0 ? (
              <div className="space-y-2">
                {salesTrend.slice(-7).map((point) => (
                  <div
                    key={point.date}
                    className="flex items-center justify-between rounded-xl border border-surface-border bg-slate-50/70 p-3 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-200"
                  >
                    <span className="font-semibold">{point.date}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatMoney(point.sales_revenue_minor)}
                      </span>
                      <span className="text-slate-400 font-mono">({point.invoice_count} inv)</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={TrendingUp}
                title="No Sales Recorded"
                description="Daily sales records will appear here once POS billing transactions are completed."
              />
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <PackageX className="h-4 w-4 text-amber-500" />
              <div>
                <CardTitle>Low Stock Alerts</CardTitle>
                <CardDescription>Products at or below reorder threshold</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {kpis && kpis.low_stock_items && kpis.low_stock_items.length > 0 ? (
              <div className="space-y-2">
                {kpis.low_stock_items.slice(0, 5).map((item) => (
                  <div
                    key={`${item.product_name}-${item.variant_name}`}
                    className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200"
                  >
                    <span className="font-semibold truncate max-w-[220px]">
                      {item.product_name} · {item.variant_name}
                    </span>
                    <span className="font-bold rounded-md bg-amber-200/60 dark:bg-amber-900/60 px-2 py-0.5">
                      {item.current_stock} left
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={AlertTriangle}
                title="No Low Stock Warnings"
                description="Products requiring replenishment will be flagged here according to minimum stock thresholds."
              />
            )}
          </CardContent>
        </Card>

        {/* Top Selling Products */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-brand-600 dark:text-brand-400" />
              <div>
                <CardTitle>Top Selling Products</CardTitle>
                <CardDescription>Highest revenue items this month</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {topProducts.length > 0 ? (
              <div className="space-y-2">
                {topProducts.map((product, index) => (
                  <div
                    key={`${product.product_name}-${product.variant_name}`}
                    className="flex items-center justify-between rounded-xl border border-surface-border bg-slate-50/70 p-3 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-200"
                  >
                    <span className="font-semibold truncate max-w-[220px]">
                      {String(index + 1)}. {product.product_name} · {product.variant_name}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatMoney(product.revenue_minor)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Award}
                title="No Product Performance Data"
                description="Best-selling products ranking will automatically calculate from completed receipt item sales."
              />
            )}
          </CardContent>
        </Card>

        {/* Recent Activity Audit Stream */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-500" />
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Stream of sales, adjustments, and shift events</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-2">
                {recentActivity.map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="flex items-center justify-between rounded-xl border border-surface-border bg-slate-50/70 p-3 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-200"
                  >
                    <span className="font-semibold capitalize truncate max-w-[220px]">
                      {item.type}: {item.label}
                    </span>
                    <span className="font-mono text-slate-500 dark:text-slate-400">
                      {item.amount_minor === undefined
                        ? new Date(item.created_at).toLocaleDateString()
                        : formatMoney(item.amount_minor)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Activity}
                title="No Recent Activity"
                description="Sales and purchase activity will appear here as transactions occur."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
