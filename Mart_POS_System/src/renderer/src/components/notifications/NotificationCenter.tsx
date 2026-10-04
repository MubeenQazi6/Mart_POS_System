import { useEffect, useRef } from 'react';
import { useNotificationsStore } from '@renderer/stores/notificationsStore';
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  X,
  ExternalLink,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function NotificationCenter(): React.JSX.Element {
  const {
    notifications,
    unreadCount,
    isOpen,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    dismiss,
    togglePanel,
    closePanel,
  } = useNotificationsStore();

  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void loadNotifications();
    const interval = setInterval(() => {
      void loadNotifications();
    }, 15000);
    return () => { clearInterval(interval); };
  }, [loadNotifications]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        closePanel();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, closePanel]);

  const handleNotificationClick = (id: string, route?: string): void => {
    void markAsRead(id);
    if (route) {
      navigate(route);
      closePanel();
    }
  };

  const renderIcon = (severity: string): React.JSX.Element => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-rose-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
      default:
        return <Info className="h-4 w-4 text-sky-600" />;
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell trigger button */}
      <button
        type="button"
        onClick={togglePanel}
        aria-label="Notifications"
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification dropdown panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-surface-border bg-white shadow-2xl z-50 overflow-hidden dark:border-slate-800 dark:bg-slate-900 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-surface-border px-4 py-3 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white">System Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                  {unreadCount} unread
                </span>
              )}
            </div>
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={() => { void markAllAsRead(); }}
                className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-brand-600 dark:text-slate-400"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-surface-border dark:divide-slate-800">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2 stroke-[1.5]" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">All Systems Normal</p>
                <p className="text-[11px] text-slate-400 mt-0.5">No active alerts or stock warnings at this time.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`group relative flex items-start gap-3 p-3 text-xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                    !notif.is_read ? 'bg-brand-50/30 dark:bg-brand-950/20' : ''
                  }`}
                >
                  <div className="mt-0.5 shrink-0">{renderIcon(notif.severity)}</div>
                  <div
                    className="flex-1 cursor-pointer min-w-0"
                    onClick={() => { handleNotificationClick(notif.id, notif.route); }}
                  >
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {notif.title}
                      </p>
                      {!notif.is_read && (
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {notif.message}
                    </p>
                    {notif.route && (
                      <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-brand-600 dark:text-brand-400">
                        <span>View Module</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void dismiss(notif.id);
                    }}
                    title="Dismiss"
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-opacity p-0.5 rounded"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer View All Link */}
          <div className="border-t border-surface-border p-2.5 bg-slate-50 text-center dark:border-slate-800 dark:bg-slate-800/60">
            <button
              type="button"
              onClick={() => {
                closePanel();
                navigate('/notifications');
              }}
              className="w-full rounded-lg py-1 text-xs font-semibold text-brand-600 hover:text-brand-700 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/40 transition-colors"
            >
              View All Notifications & History →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
