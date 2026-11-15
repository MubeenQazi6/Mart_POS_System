import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Boxes,
  Bell,
  Clock,
  LogOut,
  Database,
  Truck,
  CheckCircle2,
  X,
  AlertCircle,
  PackageCheck,
} from 'lucide-react';
import { useWarehouseAuthStore } from '../../stores/warehouseAuthStore';

interface NotificationItem {
  id: string;
  title: string;
  time: string;
  type: 'info' | 'warning' | 'success';
}

const MOCK_NOTIFICATIONS: NotificationItem[] = [
  { id: '1', title: 'Carrier TCS arrived at Bay #02 with PO-9821', time: '5m ago', type: 'info' },
  { id: '2', title: 'Bin A-01-01-B capacity reached 89% (Heavy load)', time: '22m ago', type: 'warning' },
  { id: '3', title: 'Transfer STO-2026-0041 delivered to Gulshan Mart', time: '1h ago', type: 'success' },
];

export function WarehouseHeader(): React.JSX.Element {
  const location = useLocation();
  const { user, logout } = useWarehouseAuthStore();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute dynamic breadcrumbs
  const getBreadcrumb = () => {
    switch (location.pathname) {
      case '/':
        return { section: 'Overview', page: 'Operations Command Center' };
      case '/inbound':
        return { section: 'Logistics', page: 'Goods Received Notes (Inbound GRN)' };
      case '/bins':
        return { section: 'Storage', page: 'Bin Coordinates & Zone Matrix' };
      case '/stock':
        return { section: 'Inventory', page: 'Master Stock & Batch Lots' };
      case '/transfers':
        return { section: 'Dispatch', page: 'Store Stock Transfer Orders (STO)' };
      case '/reports':
        return { section: 'Analytics', page: 'Supply Chain Reports & Audit' };
      case '/settings':
        return { section: 'System', page: 'Distribution Hub Configuration' };
      default:
        return { section: 'Hub', page: 'Warehouse Management' };
    }
  };

  const breadcrumb = getBreadcrumb();

  return (
    <>
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between select-none relative z-30 shadow-sm">
        {/* Left: Dynamic Breadcrumb */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">{breadcrumb.section}</span>
            <span className="text-slate-600">/</span>
            <span className="text-white font-bold tracking-tight">{breadcrumb.page}</span>
          </div>
        </div>

        {/* Right side: Live clock, DB health, notifications, user profile */}
        <div className="flex items-center gap-3">
          {/* Live digital clock */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-lg bg-slate-950 px-3 py-1 text-xs font-mono text-cyan-400 border border-slate-800">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span>{currentTime}</span>
          </div>

          {/* Database Health Pill */}
          <div className="hidden md:flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-1 text-xs font-medium border border-slate-800">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Database className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-slate-300 text-[11px]">DB: Isolated Warehouse</span>
          </div>

          {/* Logistics Bay Status */}
          <div className="hidden lg:flex items-center gap-1.5 rounded-lg bg-slate-950 px-2.5 py-1 text-[11px] font-semibold text-slate-300 border border-slate-800">
            <Truck className="h-3.5 w-3.5 text-cyan-400" />
            <span>Dock Bays 1-4 Ready</span>
          </div>

          {/* Notification Center */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800 transition"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan-400" />
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-white uppercase tracking-wider">Logistics Alerts</span>
                    <span className="px-1.5 py-0.2 bg-cyan-500/20 text-cyan-400 text-[10px] rounded font-bold">3 New</span>
                  </div>
                  <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-2.5">
                  {MOCK_NOTIFICATIONS.map((n) => (
                    <div key={n.id} className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 text-xs">
                      <div className="flex items-start gap-2">
                        {n.type === 'warning' ? (
                          <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        ) : n.type === 'success' ? (
                          <PackageCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className="text-slate-200 font-medium leading-snug">{n.title}</p>
                          <span className="text-[10px] text-slate-500 mt-1 block">{n.time}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User profile with role & logout */}
          <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold text-xs shadow-sm">
                {user?.fullName?.charAt(0) || 'W'}
              </div>
              <div className="text-left text-xs hidden sm:block">
                <p className="font-bold text-slate-200 leading-tight">{user?.fullName || 'Logistics Officer'}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400 font-mono">
                    {user?.role?.replace('_', ' ') || 'Supervisor'}
                  </span>
                  <span className="text-[9px] text-slate-500">· {user?.shift || 'Morning'}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowLogoutModal(true)}
              title="Sign Out"
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors ml-1"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-sm">
            <div className="modal-header">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <LogOut className="w-4 h-4" />
                <span>Confirm Sign Out</span>
              </div>
              <button onClick={() => setShowLogoutModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="modal-body text-xs text-slate-300">
              Are you sure you want to exit WarehouseOS? Any unsaved GRN item allocations will remain in draft state.
            </div>
            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutModal(false);
                  void logout();
                }}
                className="btn-primary bg-rose-600 hover:bg-rose-500 text-white text-xs py-1.5 px-3"
              >
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
