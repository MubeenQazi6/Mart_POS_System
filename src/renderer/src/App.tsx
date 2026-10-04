import { useEffect, useState } from 'react';
import { HashRouter } from 'react-router-dom';
import type { AppInfo } from '@shared/types/app';
import { AppShell } from '@renderer/components/layout/AppShell';
import { AppRoutes } from '@renderer/routes';
import { ErrorState } from '@renderer/components/ui/ErrorState';
import { ErrorBoundary } from '@renderer/components/ErrorBoundary';
import { ToastProvider } from '@renderer/components/ui/Toast';
import { useAuthStore } from '@renderer/stores/authStore';
import { useSettingsStore } from '@renderer/stores/settingsStore';
import { useThemeStore } from '@renderer/stores/themeStore';
import { useLicensingStore } from '@renderer/stores/licensingStore';
import { LoginPage } from '@renderer/features/auth/LoginPage';
import { LicenseLockScreen } from '@renderer/features/licensing/LicenseLockScreen';
import { Crown, Loader2, Database, ShieldCheck } from 'lucide-react';
import { APP_NAME } from '@shared/constants/app';

export default function App(): React.JSX.Element {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, isInitializing, initAuth } = useAuthStore();
  const { loadSettings } = useSettingsStore();
  const { initTheme } = useThemeStore();
  const { status: licenseStatus, loadStatus: loadLicenseStatus } = useLicensingStore();

  useEffect(() => {
    let cancelled = false;

    async function initializeSystem(): Promise<void> {
      try {
        if (!window.martpos) {
          throw new Error('Secure preload API is unavailable.');
        }
        const [info] = await Promise.all([
          window.martpos.app.getInfo(),
          loadSettings(),
          initAuth(),
          loadLicenseStatus(),
        ]);

        if (!cancelled) {
          setAppInfo(info);
          // Hydrate theme from database settings
          const currentSettings = useSettingsStore.getState().settings;
          initTheme(currentSettings['theme.accent'], currentSettings['theme.mode']);
        }
      } catch (loadError) {
        if (!cancelled) {
          const message =
            loadError instanceof Error ? loadError.message : 'Failed to load application info.';
          setError(message);
        }
      }
    }

    void initializeSystem();

    return () => {
      cancelled = true;
    };
  }, [initAuth, loadSettings, initTheme, loadLicenseStatus]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        const receiptSurface = document.querySelector<HTMLElement>('.receipt-print-surface');
        if (!receiptSurface) {
          // Suppress browser default OS print dialog when no receipt is active
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, true);
    };
  }, []);


  if (error) {
    return (
      <div className="flex h-screen w-screen items-center justify-center p-8 bg-slate-900 text-slate-100">
        <ErrorState
          title="Application Initialization Error"
          message={error}
          onRetry={() => {
            window.location.reload();
          }}
        />
      </div>
    );
  }

  // Beautiful startup preloader
  if (!appInfo || isInitializing) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-950 text-slate-100 select-none">
        <div className="flex flex-col items-center max-w-sm text-center px-6 animate-in fade-in zoom-in-95 duration-300">
          {/* Logo */}
          <div className="relative mb-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 shadow-2xl ring-4 ring-amber-500/20 animate-pulse">
              <Crown className="h-11 w-11 fill-slate-950 stroke-[1.75]" aria-hidden="true" />
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-white shadow-md">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-black tracking-tight text-white uppercase">{APP_NAME}</h1>
          <p className="text-xs font-semibold text-amber-400 mt-0.5 tracking-wider uppercase">
            Retail POS & Inventory System
          </p>

          {/* Spinner */}
          <div className="mt-8 flex items-center gap-2.5 rounded-full bg-slate-900 px-4 py-2 border border-slate-800 text-xs font-medium text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
            <span>Initializing Local SQLite Engine...</span>
          </div>

          <div className="mt-6 flex items-center gap-4 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-emerald-500" />
              <span>Offline Database</span>
            </div>
            <span>·</span>
            <span>Version 0.1.0</span>
          </div>
        </div>
      </div>
    );
  }

  // License Lockout Gate: If 3-day trial has expired and system is unlicensed, lock application
  if (licenseStatus && !licenseStatus.is_active) {
    return (
      <ErrorBoundary>
        <ToastProvider>
          <LicenseLockScreen />
        </ToastProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <ToastProvider>
        {!isAuthenticated ? (
          <LoginPage />
        ) : (
          <HashRouter>
            <AppShell appInfo={appInfo}>
              <AppRoutes />
            </AppShell>
          </HashRouter>
        )}
      </ToastProvider>
    </ErrorBoundary>
  );
}
