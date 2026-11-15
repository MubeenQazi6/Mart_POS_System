import { useEffect, useState } from 'react';
import { useNotificationsStore } from '@renderer/stores/notificationsStore';
import { PageHeader } from '@renderer/components/ui/PageHeader';
import { Button } from '@renderer/components/ui/Button';
import { LoadingState } from '@renderer/components/ui/LoadingState';
import { EmptyState } from '@renderer/components/ui/EmptyState';
import {
  CheckCheck,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  X,
  ExternalLink,
  RotateCw,
  RotateCcw,
  Filter,
  EyeOff,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { NotificationSeverity } from '@shared/types/notifications';

type FilterTab = 'all' | 'unread' | 'warning' | 'error' | 'info' | 'dismissed';

export function NotificationsPage(): React.JSX.Element {
  const {
    notifications,
    dismissedNotifications,
    unreadCount,
    isLoading,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    dismiss,
    undismiss,
  } = useNotificationsStore();

  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const navigate = useNavigate();

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const displayedList = activeFilter === 'dismissed'
    ? dismissedNotifications
    : notifications.filter((notif) => {
        if (activeFilter === 'unread') return !notif.is_read;
        if (activeFilter === 'warning') return notif.severity === 'warning';
        if (activeFilter === 'error') return notif.severity === 'error';
        if (activeFilter === 'info') return notif.severity === 'info';
        return true;
      });

  const renderIcon = (severity: NotificationSeverity): React.JSX.Element => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />;
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />;
      default:
        return <Info className="h-5 w-5 text-sky-600 shrink-0" />;
    }
  };

  const getSeverityBadge = (severity: NotificationSeverity): React.JSX.Element => {
    switch (severity) {
      case 'error':
        return <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">Urgent</span>;
      case 'warning':
        return <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">Warning</span>;
      default:
        return <span className="rounded-md bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">Notice</span>;
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title="Notifications & System Alerts"
          description="Automated system conditions, inventory warnings, cash shift reminders, and hardware alerts."
        />
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => { void loadNotifications(); }}
            disabled={isLoading}
          >
            <RotateCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          {notifications.length > 0 && activeFilter !== 'dismissed' && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => { void markAllAsRead(); }}
            >
              <CheckCheck className="h-4 w-4" />
              <span>Mark All as Read</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border pb-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => { setActiveFilter('all'); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeFilter === 'all'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-surface-border dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800'
              }`}
            >
              Active ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => { setActiveFilter('unread'); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeFilter === 'unread'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-surface-border dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              type="button"
              onClick={() => { setActiveFilter('error'); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeFilter === 'error'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-surface-border dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800'
              }`}
            >
              Urgent ({notifications.filter((n) => n.severity === 'error').length})
            </button>
            <button
              type="button"
              onClick={() => { setActiveFilter('warning'); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeFilter === 'warning'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-surface-border dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800'
              }`}
            >
              Warnings ({notifications.filter((n) => n.severity === 'warning').length})
            </button>
            <button
              type="button"
              onClick={() => { setActiveFilter('dismissed'); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeFilter === 'dismissed'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-surface-border dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800'
              }`}
            >
              <EyeOff className="h-3.5 w-3.5" />
              Dismissed ({dismissedNotifications.length})
            </button>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      {isLoading && notifications.length === 0 && dismissedNotifications.length === 0 ? (
        <LoadingState message="Checking system alerts..." />
      ) : displayedList.length === 0 ? (
        <div className="rounded-2xl border border-surface-border bg-white p-12 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <EmptyState
            icon={CheckCircle2}
            title={activeFilter === 'dismissed' ? 'No Dismissed Notifications' : activeFilter === 'all' ? 'All Systems Healthy' : 'No notifications in this filter'}
            description={
              activeFilter === 'dismissed'
                ? 'You have not dismissed any alerts. Active warnings and notices appear under Active.'
                : 'All store modules, stock levels, cash registers, and software license limits are running normally.'
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          {displayedList.map((notif) => (
            <div
              key={notif.id}
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border p-4 shadow-xs transition-all ${
                activeFilter === 'dismissed'
                  ? 'border-slate-200 bg-slate-50/70 opacity-80 dark:border-slate-800 dark:bg-slate-900/50'
                  : !notif.is_read
                    ? 'border-brand-300 bg-brand-50/40 dark:border-brand-800 dark:bg-brand-950/30'
                    : 'border-surface-border bg-white dark:border-slate-800 dark:bg-slate-900'
              }`}
            >
              <div className="flex items-start gap-3.5 min-w-0">
                {renderIcon(notif.severity)}
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {notif.title}
                    </h4>
                    {getSeverityBadge(notif.severity)}
                    {activeFilter === 'dismissed' && (
                      <span className="rounded-md bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        Dismissed
                      </span>
                    )}
                    {!notif.is_read && activeFilter !== 'dismissed' && (
                      <span className="h-2 w-2 rounded-full bg-brand-600" />
                    )}
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                      {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(notif.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {notif.message}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                {notif.route && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      void markAsRead(notif.id);
                      navigate(notif.route!);
                    }}
                  >
                    <span>Open Module</span>
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                )}

                {activeFilter === 'dismissed' ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => { void undismiss(notif.id); }}
                    leftIcon={<RotateCcw className="h-3.5 w-3.5 text-brand-600" />}
                    title="Restore to active alerts"
                  >
                    <span>Restore</span>
                  </Button>
                ) : (
                  <>
                    {!notif.is_read && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => { void markAsRead(notif.id); }}
                        title="Mark as read"
                      >
                        <CheckCheck className="h-4 w-4 text-slate-500" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => { void dismiss(notif.id); }}
                      title="Dismiss notification"
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
