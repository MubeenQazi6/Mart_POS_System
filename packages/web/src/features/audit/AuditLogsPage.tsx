import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@renderer/components/ui/PageHeader';
import { Button } from '@renderer/components/ui/Button';
import { Input } from '@renderer/components/ui/Input';
import { Badge } from '@renderer/components/ui/Badge';
import { LoadingState } from '@renderer/components/ui/LoadingState';
import { EmptyState } from '@renderer/components/ui/EmptyState';
import { useAuditStore } from '@renderer/stores/auditStore';
import { useAuthStore } from '@renderer/stores/authStore';
import { ShieldAlert, Search, RefreshCw, Activity, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { showToast } from '@renderer/components/ui/Toast';

export function AuditLogsPage(): React.JSX.Element {
  const { logs, isLoading, loadLogs, filters, setFilters, resetFilters } = useAuditStore();
  const { can } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pageSize, setPageSize] = useState<number | 'all'>(25);
  const [currentPage, setCurrentPage] = useState(1);

  // Load logs on mount
  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  // Sync searchTerm with filters when filters change externally
  useEffect(() => {
    setSearchTerm(filters.search || '');
    setCurrentPage(1);
  }, [filters.search]);

  // Debounced search - only search when user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== filters.search) {
        setFilters({ search: searchTerm || undefined });
        setCurrentPage(1);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, setFilters, filters.search]);

  // Handle refresh - clears search and loads all data
  const handleRefresh = useCallback(async (): Promise<void> => {
    setIsRefreshing(true);
    try {
      // Clear search input
      setSearchTerm('');
      // Reset all filters
      resetFilters();
      // Load fresh data
      await loadLogs();
      showToast('success', 'Audit logs refreshed successfully');
    } catch (error) {
      console.error('Refresh error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh audit logs';
      showToast('error', errorMessage);
    } finally {
      setIsRefreshing(false);
    }
  }, [resetFilters, loadLogs]);

  // Handle clearing search
  const handleClearSearch = (): void => {
    setSearchTerm('');
    setFilters({ search: undefined });
  };

  // Handle manual search submit (for Enter key)
  const handleSearchSubmit = (e: React.SyntheticEvent): void => {
    e.preventDefault();
    setFilters({ search: searchTerm || undefined });
  };

  // Clear all filters
  const handleClearAllFilters = (): void => {
    setSearchTerm('');
    setFilters({
      search: undefined,
      event_type: undefined,
      status: undefined,
    });
  };

  if (!can('audit.view')) {
    return (
      <div className="p-6">
        <PageHeader
          title="Security & Audit Trail"
          description="System activity, login events, and operational trail"
        />
        <div className="mt-8 p-6 bg-white border border-surface-border rounded-xl text-center flex flex-col items-center shadow-xs dark:bg-slate-900 dark:border-slate-800">
          <ShieldAlert className="w-12 h-12 text-amber-500 mb-3 dark:text-amber-400" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
            Access Restricted
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
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
              void handleRefresh();
            }}
            disabled={isRefreshing || isLoading}
            className="gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing || isLoading ? 'animate-spin' : ''}`} />
            <span>{isRefreshing || isLoading ? 'Refreshing...' : 'Refresh'}</span>
          </Button>
        }
      />

      {/* Filter Bar */}
      <div className="bg-white border border-surface-border rounded-xl p-4 flex flex-wrap gap-4 items-center justify-between shadow-xs dark:bg-slate-900 dark:border-slate-700">
        <form
          onSubmit={(e) => {
            handleSearchSubmit(e);
          }}
          className="flex items-center gap-2 flex-1 max-w-md"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <Input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
              }}
              placeholder="Search user, event type, details..."
              className="pl-9 h-9 text-xs dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>

        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={filters.event_type || ''}
            onChange={(e) => {
              setFilters({ event_type: e.target.value || undefined });
            }}
            className="h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:focus:border-brand-500"
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
            className="h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:focus:border-brand-500"
          >
            <option value="">All Statuses</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILED">FAILED</option>
          </select>

          {/* Clear all filters button */}
          {(filters.event_type || filters.status || filters.search) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAllFilters}
              className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
            >
              <X className="w-4 h-4 mr-1" />
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-surface-border rounded-xl overflow-hidden shadow-xs dark:bg-slate-900 dark:border-slate-700">
        {isLoading ? (
          <LoadingState message="Loading security audit records..." />
        ) : logs.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No Audit Logs Found"
            description={
              filters.search || filters.event_type || filters.status
                ? 'No audit events match your current filters. Try clearing your filters.'
                : 'Audit events will appear here as system activity occurs.'
            }
          />
        ) : (
          (() => {
            const totalRecords = logs.length;
            const isAll = pageSize === 'all';
            const effectivePageSize = isAll ? totalRecords || 1 : Number(pageSize);
            const totalPages = isAll ? 1 : Math.max(1, Math.ceil(totalRecords / effectivePageSize));
            const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
            const startIndex = isAll ? 0 : (safeCurrentPage - 1) * effectivePageSize;
            const endIndex = isAll ? totalRecords : Math.min(startIndex + effectivePageSize, totalRecords);
            const displayedLogs = isAll ? logs : logs.slice(startIndex, endIndex);

            return (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700">
                    <tr>
                      <th className="py-3.5 px-4 w-16 text-center">S.No</th>
                      <th className="py-3.5 px-4">Date & Time</th>
                      <th className="py-3.5 px-4">Event Type</th>
                      <th className="py-3.5 px-4">Operator / User</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Details / Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {displayedLogs.map((log, idx) => {
                      const serialNumber = startIndex + idx + 1;
                      return (
                        <tr
                          key={log.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="py-3.5 px-4 text-center font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {serialNumber}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono text-xs">
                            {log.created_at}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-200 text-[11px] dark:text-slate-200 dark:bg-slate-800 dark:border-slate-700">
                              {log.event_type}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-sans font-medium text-slate-800 dark:text-slate-200">
                            {log.username_snapshot || 'System'}
                          </td>
                          <td className="py-3.5 px-4 font-sans">
                            <Badge variant={log.status === 'SUCCESS' ? 'success' : 'danger'}>
                              {log.status}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 font-sans text-slate-600 dark:text-slate-300 max-w-md truncate">
                            {log.details || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Table footer with pagination controls */}
                <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-600 dark:text-slate-400">Rows per page:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPageSize(val === 'all' ? 'all' : Number(val));
                          setCurrentPage(1);
                        }}
                        className="h-8 px-2 text-xs font-semibold bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                      >
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={75}>75</option>
                        <option value="all">All</option>
                      </select>
                    </div>

                    <span className="text-slate-500 dark:text-slate-400">
                      Showing <span className="font-semibold text-slate-800 dark:text-slate-200">{totalRecords === 0 ? 0 : startIndex + 1}</span>–<span className="font-semibold text-slate-800 dark:text-slate-200">{endIndex}</span> of <span className="font-semibold text-slate-800 dark:text-slate-200">{totalRecords}</span> record{totalRecords !== 1 ? 's' : ''}
                      {filters.search && ` (filtered)`}
                    </span>
                  </div>

                  {!isAll && totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={safeCurrentPage <= 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className="h-8 px-2.5 text-xs font-medium"
                      >
                        <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                        Previous
                      </Button>

                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 px-1">
                        Page {safeCurrentPage} of {totalPages}
                      </span>

                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={safeCurrentPage >= totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className="h-8 px-2.5 text-xs font-medium"
                      >
                        Next
                        <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}
