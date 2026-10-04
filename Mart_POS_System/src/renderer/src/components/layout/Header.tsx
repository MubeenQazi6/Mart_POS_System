import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { AppInfo } from '@shared/types/app';
import { NAV_SECTIONS, ALL_NAV_ITEMS } from '@shared/constants/app';
import { User, PanelLeft, Clock, LogOut, ShieldCheck, ShieldAlert, Moon, Sun } from 'lucide-react';
import { Tooltip } from '@renderer/components/ui/Tooltip';
import { useAuthStore } from '@renderer/stores/authStore';
import { useThemeStore } from '@renderer/stores/themeStore';
import { NotificationCenter } from '@renderer/components/notifications/NotificationCenter';
import { useLicensingStore } from '@renderer/stores/licensingStore';

interface HeaderProps {
  appInfo: AppInfo;
  onToggleSidebar?: () => void;
}

export function Header({ appInfo, onToggleSidebar }: HeaderProps): React.JSX.Element {
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState<string>('');
  const { currentUser, logout } = useAuthStore();
  const { status: licenseStatus, openActivationModal } = useLicensingStore();
  const { mode, setMode } = useThemeStore();

  useEffect(() => {
    const updateTime = (): void => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  // Find active item and section for dynamic breadcrumb & title
  const activeItem =
    ALL_NAV_ITEMS.find((item) => item.path === location.pathname) ??
    (location.pathname === '/' ? ALL_NAV_ITEMS[0] : null);

  const activeSection = NAV_SECTIONS.find((sec) =>
    sec.items.some((item) => item.path === location.pathname),
  );

  const toggleThemeMode = (): void => {
    const nextMode = mode === 'dark' ? 'light' : 'dark';
    void setMode(nextMode);
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-surface-border bg-white px-5 shadow-xs select-none dark:border-slate-800 dark:bg-slate-900">
      {/* Left side: Sidebar toggle, Breadcrumb & Title */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        )}

        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>{activeSection?.title ?? 'Application'}</span>
            <span>/</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {activeItem?.label ?? (location.pathname === '/' ? 'Dashboard' : 'Page Not Found')}
            </span>
          </div>
        </div>
      </div>

      {/* Right side: Live clock, theme toggle, notifications, license badge, user, version info */}
      <div className="flex items-center gap-3">
        {/* Live clock */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-mono text-slate-600 border border-surface-border dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
          <Clock className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
          <span>{currentTime}</span>
        </div>

        {/* Dark/Light mode fast toggle */}
        <Tooltip content={mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'} side="bottom">
          <button
            type="button"
            onClick={toggleThemeMode}
            aria-label="Toggle theme mode"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
          >
            {mode === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
          </button>
        </Tooltip>

        {/* License Indicator */}
        <Tooltip
          content={
            licenseStatus?.status === 'VALID'
              ? `Licensed: ${licenseStatus.customer_name ?? ''} (${licenseStatus.business_name ?? ''})`
              : licenseStatus?.status === 'TRIAL'
                ? `Running in 3-Day Free Trial (${String(licenseStatus.days_remaining)} day(s) left) — Click to Activate`
                : 'Software Unlicensed / Trial Expired — Click to Activate'
          }
          side="bottom"
        >
          <button
            type="button"
            onClick={openActivationModal}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border transition-colors ${
              licenseStatus?.status === 'VALID'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60'
                : licenseStatus?.status === 'TRIAL'
                  ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60 animate-pulse'
                  : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60 animate-bounce'
            }`}
          >
            {licenseStatus?.status === 'VALID' ? (
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <ShieldAlert className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            )}
            <span className="hidden md:inline">
              {licenseStatus?.status === 'VALID'
                ? 'Licensed'
                : licenseStatus?.status === 'TRIAL'
                  ? `Trial: ${String(licenseStatus.days_remaining)}d left`
                  : 'Activate'}
            </span>
          </button>
        </Tooltip>

        {/* In-app Notification Center */}
        <NotificationCenter />

        {/* User profile & role */}
        <div className="flex items-center gap-2 border-l border-surface-border pl-3 dark:border-slate-800">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700 border border-brand-200 dark:bg-brand-950/60 dark:text-brand-300 dark:border-brand-800/60 font-bold text-xs">
            <User className="h-4 w-4" />
          </div>
          <div className="hidden md:block text-left text-xs">
            <p className="font-semibold text-slate-900 dark:text-white leading-tight">
              {currentUser?.full_name || 'Admin User'}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 capitalize font-mono">
              {currentUser?.role === 'store_manager' ? 'Store Manager' : currentUser?.role || 'Administrator'}
            </p>
          </div>
        </div>

        {/* Logout Button */}
        <Tooltip content="Sign Out (Lock POS)" side="bottom">
          <button
            type="button"
            onClick={() => {
              void logout();
            }}
            aria-label="Logout"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-500 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </Tooltip>

        {/* App Version */}
        <div className="hidden lg:block text-right text-[10px] text-slate-400 border-l border-surface-border pl-3 dark:border-slate-800">
          <p>v{appInfo.version}</p>
        </div>
      </div>
    </header>
  );
}
