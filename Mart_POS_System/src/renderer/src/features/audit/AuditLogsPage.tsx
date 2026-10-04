import { useEffect, useState } from 'react';
import { PageHeader } from '@renderer/components/ui/PageHeader';
import { Button } from '@renderer/components/ui/Button';
import { Input } from '@renderer/components/ui/Input';
import { Badge } from '@renderer/components/ui/Badge';
import { LoadingState } from '@renderer/components/ui/LoadingState';
import { EmptyState } from '@renderer/components/ui/EmptyState';
import { useAuditStore } from '@renderer/stores/auditStore';
import { useAuthStore } from '@renderer/stores/authStore';
import { ShieldAlert, Search, RefreshCw, Activity } from 'lucide-react';

export function AuditLogsPage(): React.JSX.Element {
  const { logs, isLoading, loadLogs, filters, setFilters } = useAuditStore();
  const { can } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const handleSearchSubmit = (e: React.SyntheticEvent): void => {
    e.preventDefault();
    setFilters({ search: searchTerm });
  };

  if (!can('audit.view')) {
    return (
      <div className="p-6">
        <PageHeader title="Security & Audit Trail" description="System activity, login events, and operational trail" />
        <div className="mt-8 p-6 bg-slate-800 border border-slate-700 rounded-xl text-center flex flex-col items-center">
          <ShieldAlert className="w-12 h-12 text-amber-400 mb-3" />
          <h2 className="text-lg font-semibold text-slate-100 mb-1">Access Restricted</h2>
          <p className="text-xs text-slate-400 max-w-md">
            You do not have permission to view security audit logs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Security & System Audit Trail"
        description="Immutable chronological trail of logins, security events, and database actions"
        actions={
          <Button
            variant="secondary"
            onClick={() => {
              void loadLogs();
            }}
            className="gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        }
      />

      {/* Filter Bar */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-wrap gap-4 items-center justify-between shadow-sm">
        <form
          onSubmit={(e) => {
            handleSearchSubmit(e);
          }}
          className="flex items-center gap-2 flex-1 max-w-md"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
              }}
              placeholder="Search user, event type, details..."
              className="pl-9 h-9 text-xs"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>

        <div className="flex items-center gap-3">
          <select
            value={filters.event_type || ''}
            onChange={(e) => {
              setFilters({ event_type: e.target.value || undefined });
            }}
            className="h-9 px-3 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Event Types</option>
            <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
            <option value="LOGIN_FAILED">LOGIN_FAILED</option>
            <option value="LOGOUT">LOGOUT</option>
            <option value="USER_CREATE">USER_CREATE</option>
            <option value="USER_UPDATE">USER_UPDATE</option>
            <option value="PASSWORD_CHANGE">PASSWORD_CHANGE</option>
            <option value="PASSWORD_RESET">PASSWORD_RESET</option>
            <option value="STOCK_ADJUSTMENT">STOCK_ADJUSTMENT</option>
            <option value="PURCHASE_CREATE">PURCHASE_CREATE</option>
            <option value="CREDIT_SALE">CREDIT_SALE</option>
            <option value="KHATA_PAYMENT">KHATA_PAYMENT</option>
          </select>

          <select
            value={filters.status || ''}
            onChange={(e) => {
              const val = e.target.value;
              setFilters({ status: val === 'SUCCESS' || val === 'FAILED' ? val : undefined });
            }}
            className="h-9 px-3 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Statuses</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILED">FAILED</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <LoadingState message="Loading security audit records..." />
        ) : logs.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No Audit Logs Found"
            description="Audit events matching your search criteria will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/60 text-slate-400 text-xs uppercase font-semibold border-b border-slate-700">
                <tr>
                  <th className="py-3.5 px-4 w-16 text-center">S.No</th>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Event Type</th>
                  <th className="py-3.5 px-4">Operator / User</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Details / Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60 font-mono text-xs">
                {logs.map((log, index) => {
                  return (
                    <tr key={log.id} className="hover:bg-slate-750/50 transition-colors">
                      <td className="py-3.5 px-4 text-center font-semibold text-slate-500">
                        {index + 1}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">{log.created_at}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-200 bg-slate-900/80 px-2 py-1 rounded border border-slate-700 text-[11px]">
                          {log.event_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-sans font-medium text-slate-200">
                        {log.username_snapshot || 'System'}
                      </td>
                      <td className="py-3.5 px-4 font-sans">
                        <Badge variant={log.status === 'SUCCESS' ? 'success' : 'danger'}>
                          {log.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 font-sans text-slate-300 max-w-md truncate">
                        {log.details || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
