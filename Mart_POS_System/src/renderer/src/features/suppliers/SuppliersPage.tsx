import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@renderer/components/ui/PageHeader';
import { Button } from '@renderer/components/ui/Button';
import { Input } from '@renderer/components/ui/Input';
import { Badge } from '@renderer/components/ui/Badge';
import { LoadingState } from '@renderer/components/ui/LoadingState';
import { EmptyState } from '@renderer/components/ui/EmptyState';
import { useSuppliersStore } from '@renderer/stores/suppliersStore';
import { formatMoney } from '@shared/utils/money';
import type { SupplierRow } from '@shared/types/purchases';
import { SupplierModal } from './SupplierModal';
import { SupplierLedgerModal } from './SupplierLedgerModal';
import {
  Truck,
  Plus,
  Search,
  RefreshCw,
  ClipboardList,
  Edit2,
  Phone,
  DollarSign,
} from 'lucide-react';

export function SuppliersPage(): React.JSX.Element {
  const {
    suppliers,
    isLoadingSuppliers,
    filters,
    setFilters,
    loadSuppliers,
    selectSupplier,
    selectedSupplier,
  } = useSuppliersStore();

  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierRow | null>(null);
  const [searchInput, setSearchInput] = useState(filters.search ?? '');

  useEffect(() => {
    void loadSuppliers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ search: searchInput || undefined });
    }, 300);
    return () => { clearTimeout(timer); };
  }, [searchInput, setFilters]);

  const handleRefresh = useCallback(() => {
    void loadSuppliers();
  }, [loadSuppliers]);

  const handleOpenAdd = (): void => {
    setEditingSupplier(null);
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (sup: SupplierRow): void => {
    setEditingSupplier(sup);
    setIsAddEditOpen(true);
  };

  const handleOpenLedger = (sup: SupplierRow): void => {
    selectSupplier(sup);
    setIsLedgerOpen(true);
  };

  let totalPayablesMinor = 0;
  for (const s of suppliers) {
    if (s.current_balance_minor > 0) totalPayablesMinor += s.current_balance_minor;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        title="Suppliers Directory"
        description="Manage vendors, wholesale distributors, inbound purchase history, and payable balances."
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Active Suppliers</p>
            <p className="text-xl font-bold text-slate-800">{String(suppliers.length)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Outstanding Payables</p>
            <p className={`text-xl font-bold ${totalPayablesMinor > 0 ? 'text-red-700' : 'text-slate-800'}`}>
              {formatMoney(totalPayablesMinor)}
            </p>
          </div>
        </div>
      </div>

      {/* Action & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex-1 min-w-[240px] max-w-md">
          <Input
            id="supplier-search"
            placeholder="Search by supplier name, contact, phone…"
            leftIcon={<Search className="h-4 w-4" />}
            value={searchInput}
            onChange={(e) => { setSearchInput(e.target.value); }}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={handleRefresh}
            isLoading={isLoadingSuppliers}
          >
            Refresh
          </Button>
          <Button
            id="add-supplier-btn"
            variant="primary"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={handleOpenAdd}
          >
            Add Supplier
          </Button>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        {isLoadingSuppliers ? (
          <LoadingState message="Loading suppliers…" />
        ) : suppliers.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="No Suppliers Found"
            description={
              filters.search
                ? `No suppliers matching "${filters.search}".`
                : 'No suppliers added yet. Click "Add Supplier" to register wholesale distributors.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Supplier / Company</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Contact Person</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Location</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Payable Balance</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900">{s.name}</td>
                    <td className="px-4 py-3 text-slate-600">{s.contact_person ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                      {s.phone ? (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3 text-slate-400" />
                          {s.phone}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-[200px] truncate">{s.address ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      <span className={s.current_balance_minor > 0 ? 'text-red-700' : 'text-emerald-700'}>
                        {formatMoney(s.current_balance_minor)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={s.is_active ? 'success' : 'neutral'}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<ClipboardList className="h-3.5 w-3.5" />}
                          onClick={() => { handleOpenLedger(s); }}
                        >
                          Ledger
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Edit2 className="h-3.5 w-3.5" />}
                          onClick={() => { handleOpenEdit(s); }}
                        >
                          Edit
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <SupplierModal
        isOpen={isAddEditOpen}
        onClose={() => { setIsAddEditOpen(false); setEditingSupplier(null); }}
        supplier={editingSupplier}
      />
      <SupplierLedgerModal
        isOpen={isLedgerOpen}
        onClose={() => { setIsLedgerOpen(false); selectSupplier(null); }}
        supplier={selectedSupplier}
      />
    </div>
  );
}
