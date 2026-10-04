import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@renderer/components/ui/PageHeader';
import { Button } from '@renderer/components/ui/Button';
import { Input } from '@renderer/components/ui/Input';
import { Badge } from '@renderer/components/ui/Badge';
import { LoadingState } from '@renderer/components/ui/LoadingState';
import { EmptyState } from '@renderer/components/ui/EmptyState';
import { usePurchasesStore } from '@renderer/stores/purchasesStore';
import { useSuppliersStore } from '@renderer/stores/suppliersStore';
import { formatMoney } from '@shared/utils/money';
import type { PurchaseRow, PaymentStatus } from '@shared/types/purchases';
import { CreatePurchaseModal } from './CreatePurchaseModal';
import { PurchaseDetailsModal } from './PurchaseDetailsModal';
import { ReturnExchangeModal } from '../returns/ReturnExchangeModal';
import { ShoppingBag, Plus, Search, RefreshCw, Eye, DollarSign, Truck, RotateCcw } from 'lucide-react';

function paymentStatusBadge(status: PaymentStatus): {
  variant: 'success' | 'warning' | 'danger';
  label: string;
} {
  switch (status) {
    case 'paid':
      return { variant: 'success', label: 'Paid' };
    case 'partial':
      return { variant: 'warning', label: 'Partial' };
    case 'unpaid':
      return { variant: 'danger', label: 'Unpaid' };
  }
}

function formatDateTime(isoString: string): string {
  try {
    return new Date(isoString).toLocaleString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export function PurchasesPage(): React.JSX.Element {
  const {
    purchases,
    isLoadingPurchases,
    filters,
    setFilters,
    loadPurchases,
    loadKpis,
    kpis,
    selectedPurchase,
    loadPurchaseById,
    clearSelected,
  } = usePurchasesStore();

  const { suppliers, loadSuppliers } = useSuppliersStore();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isSupplierReturnOpen, setIsSupplierReturnOpen] = useState(false);
  const [supplierReturnInitialSource, setSupplierReturnInitialSource] = useState('');
  const [searchInput, setSearchInput] = useState(filters.search ?? '');

  useEffect(() => {
    void loadPurchases();
    void loadKpis();
    void loadSuppliers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ search: searchInput || undefined });
    }, 300);
    return () => {
      clearTimeout(timer);
    };
  }, [searchInput, setFilters]);

  const handleRefresh = useCallback(() => {
    void loadPurchases();
    void loadKpis();
  }, [loadPurchases, loadKpis]);

  const handleViewPurchase = async (purchase: PurchaseRow): Promise<void> => {
    await loadPurchaseById(purchase.id);
    setIsDetailsOpen(true);
  };

  const handleOpenSupplierReturn = (purchaseNumber = ''): void => {
    setSupplierReturnInitialSource(purchaseNumber);
    setIsSupplierReturnOpen(true);
  };

  const supplierFilterOptions = [
    { value: '', label: 'All Suppliers' },
    ...suppliers.map((s) => ({ value: String(s.id), label: s.name })),
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        title="Purchases & Inward Orders"
        description="Supplier purchase orders, inward stock receiving, bills, and payment status."
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Total Purchase Orders
            </p>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {String(kpis?.total_purchases_count ?? purchases.length)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Total Purchases Value
            </p>
            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
              {formatMoney(kpis?.total_purchases_value_minor ?? 0)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Total Outstanding Payables
            </p>
            <p
              className={`text-xl font-bold ${(kpis?.total_payables_minor ?? 0) > 0 ? 'text-red-700 dark:text-red-400' : 'text-slate-800 dark:text-slate-100'}`}
            >
              {formatMoney(kpis?.total_payables_minor ?? 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Action & Filter Bar */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex-1 min-w-[220px]">
          <Input
            id="purchase-search"
            label="Search"
            placeholder="PO number, supplier invoice #, or supplier…"
            leftIcon={<Search className="h-4 w-4" />}
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
            }}
          />
        </div>

        <div className="w-48">
          <label className="block text-xs font-medium text-slate-700 mb-1.5 dark:text-slate-300">
            Supplier
          </label>
          <select
            id="purchase-filter-supplier"
            className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:hover:border-slate-500"
            value={filters.supplier_id !== undefined ? String(filters.supplier_id) : ''}
            onChange={(e) => {
              const val = e.target.value;
              setFilters({ supplier_id: val ? Number(val) : undefined });
            }}
          >
            {supplierFilterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="w-36">
          <label className="block text-xs font-medium text-slate-700 mb-1.5 dark:text-slate-300">
            Payment
          </label>
          <select
            id="purchase-filter-status"
            className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:hover:border-slate-500"
            value={filters.payment_status || ''}
            onChange={(e) => {
              const val = e.target.value as PaymentStatus | '';
              setFilters({ payment_status: val || undefined });
            }}
          >
            <option value="">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={handleRefresh}
            isLoading={isLoadingPurchases}
          >
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RotateCcw className="h-4 w-4 text-purple-600" />}
            onClick={() => {
              handleOpenSupplierReturn();
            }}
          >
            Supplier Return
          </Button>
          <Button
            id="new-purchase-btn"
            variant="primary"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setIsCreateOpen(true);
            }}
          >
            New Purchase
          </Button>
        </div>
      </div>

      {/* Purchases Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-700 dark:bg-slate-800">
        {isLoadingPurchases ? (
          <LoadingState message="Loading purchase records…" />
        ) : purchases.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="No Purchases Found"
            description={
              filters.search || filters.supplier_id || filters.payment_status
                ? 'No purchases match your active filters.'
                : 'No purchase orders recorded yet. Click "New Purchase" to receive inward stock.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 dark:bg-slate-700/50 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    PO Number
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Date / Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Supplier
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Supplier Inv #
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Total Amount
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Balance
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {purchases.map((p) => {
                  const { variant, label } = paymentStatusBadge(p.payment_status);
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {p.purchase_number}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs whitespace-nowrap">
                        {formatDateTime(p.created_at)}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                        {p.supplier_name}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400 text-xs">
                        {p.supplier_invoice_number ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-slate-100">
                        {formatMoney(p.total_minor)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        <span
                          className={
                            p.balance_minor > 0
                              ? 'text-red-700 dark:text-red-400'
                              : 'text-slate-500 dark:text-slate-400'
                          }
                        >
                          {formatMoney(p.balance_minor)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={variant}>{label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Eye className="h-3.5 w-3.5" />}
                            onClick={() => {
                              void handleViewPurchase(p);
                            }}
                          >
                            Details
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<RotateCcw className="h-3.5 w-3.5 text-purple-600" />}
                            onClick={() => {
                              handleOpenSupplierReturn(p.purchase_number);
                            }}
                          >
                            Return
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreatePurchaseModal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
        }}
      />
      <PurchaseDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          clearSelected();
        }}
        purchase={selectedPurchase}
        onReturn={(purchase) => {
          setIsDetailsOpen(false);
          handleOpenSupplierReturn(purchase.purchase_number);
        }}
      />
      {isSupplierReturnOpen && (
        <ReturnExchangeModal
          isOpen={isSupplierReturnOpen}
          onClose={() => {
            setIsSupplierReturnOpen(false);
          }}
          defaultWorkMode="purchases"
          defaultActionMode="return"
          initialSourceNumber={supplierReturnInitialSource}
          onComplete={() => {
            handleRefresh();
          }}
        />
      )}
    </div>
  );
}
