import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@renderer/components/ui/PageHeader';
import { Button } from '@renderer/components/ui/Button';
import { Input } from '@renderer/components/ui/Input';
import { Badge } from '@renderer/components/ui/Badge';
import { LoadingState } from '@renderer/components/ui/LoadingState';
import { EmptyState } from '@renderer/components/ui/EmptyState';
import { useCustomersStore } from '@renderer/stores/customersStore';
import { formatMoney } from '@shared/utils/money';
import type { CustomerRow } from '@shared/types/customers';
import { CustomerModal } from './CustomerModal';
import { CustomerLedgerModal } from './CustomerLedgerModal';
import {
  Users,
  Plus,
  Search,
  RefreshCw,
  ClipboardList,
  Edit2,
  Phone,
  DollarSign,
  Filter,
} from 'lucide-react';

export function CustomersPage(): React.JSX.Element {
  const {
    customers,
    isLoadingCustomers,
    filters,
    setFilters,
    loadCustomers,
    loadKpis,
    kpis,
    selectCustomer,
    selectedCustomer,
  } = useCustomersStore();

  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerRow | null>(null);
  const [searchInput, setSearchInput] = useState(filters.search ?? '');

  useEffect(() => {
    void loadCustomers();
    void loadKpis();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ search: searchInput || undefined });
    }, 300);
    return () => { clearTimeout(timer); };
  }, [searchInput, setFilters]);

  const handleRefresh = useCallback(() => {
    void loadCustomers();
    void loadKpis();
  }, [loadCustomers, loadKpis]);

  const handleOpenAdd = (): void => {
    setEditingCustomer(null);
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (cust: CustomerRow): void => {
    setEditingCustomer(cust);
    setIsAddEditOpen(true);
  };

  const handleOpenLedger = (cust: CustomerRow): void => {
    selectCustomer(cust);
    setIsLedgerOpen(true);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        title="Customers & Khata Accounts"
        description="Customer directory, Khata credit accounts, credit limits, payment history, and receivables."
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Registered Customers</p>
            <p className="text-xl font-bold text-slate-800">{String(kpis?.total_customers_count ?? customers.length)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Khata Receivables</p>
            <p className={`text-xl font-bold ${(kpis?.total_receivables_minor ?? 0) > 0 ? 'text-amber-700' : 'text-slate-800'}`}>
              {formatMoney(kpis?.total_receivables_minor ?? 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Action & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex-1 min-w-[240px] max-w-md">
          <Input
            id="customer-search"
            placeholder="Search by name, phone number, email…"
            leftIcon={<Search className="h-4 w-4" />}
            value={searchInput}
            onChange={(e) => { setSearchInput(e.target.value); }}
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
            <input
              id="customer-balance-filter"
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              checked={filters.has_balance_only ?? false}
              onChange={(e) => { setFilters({ has_balance_only: e.target.checked || undefined }); }}
            />
            <Filter className="h-4 w-4 text-amber-500" />
            With Khata Debt only
          </label>

          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={handleRefresh}
            isLoading={isLoadingCustomers}
          >
            Refresh
          </Button>
          <Button
            id="register-customer-btn"
            variant="primary"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={handleOpenAdd}
          >
            Register Customer
          </Button>
        </div>
      </div>

      {/* Customers Table */}
      <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        {isLoadingCustomers ? (
          <LoadingState message="Loading customers…" />
        ) : customers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No Customers Found"
            description={
              filters.search || filters.has_balance_only
                ? 'No customers match your active filter criteria.'
                : 'No customers registered yet. Click "Register Customer" to create customer Khata profiles.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Customer Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Phone Number</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Address</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Credit Limit</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Khata Debt</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900">{c.name}</td>
                    <td className="px-4 py-3 text-slate-700 font-mono text-xs">
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3 text-slate-400" />
                        {c.phone}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-[200px] truncate">{c.address ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {c.credit_limit_minor > 0 ? formatMoney(c.credit_limit_minor) : 'Unlimited'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      <span className={c.current_balance_minor > 0 ? 'text-amber-700' : 'text-slate-500'}>
                        {formatMoney(c.current_balance_minor)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={c.is_active ? 'success' : 'neutral'}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<ClipboardList className="h-3.5 w-3.5" />}
                          onClick={() => { handleOpenLedger(c); }}
                        >
                          Khata Ledger
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Edit2 className="h-3.5 w-3.5" />}
                          onClick={() => { handleOpenEdit(c); }}
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
      <CustomerModal
        isOpen={isAddEditOpen}
        onClose={() => { setIsAddEditOpen(false); setEditingCustomer(null); }}
        customer={editingCustomer}
      />
      <CustomerLedgerModal
        isOpen={isLedgerOpen}
        onClose={() => { setIsLedgerOpen(false); selectCustomer(null); }}
        customer={selectedCustomer}
      />
    </div>
  );
}
