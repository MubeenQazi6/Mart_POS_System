import { useState, useEffect, useRef, type ReactNode } from 'react';
import type { AppInfo } from '@shared/types/app';
import { Sidebar } from '@renderer/components/layout/Sidebar';
import { Header } from '@renderer/components/layout/Header';
import { ActivationModal } from '@renderer/features/licensing/ActivationModal';
import { useAuthStore } from '@renderer/stores/authStore';
import { useSettingsStore } from '@renderer/stores/settingsStore';
import { showToast } from '@renderer/components/ui/Toast';

interface AppShellProps {
  appInfo: AppInfo;
  children: ReactNode;
}

export function AppShell({ appInfo, children }: AppShellProps): React.JSX.Element {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const { isAuthenticated, logout } = useAuthStore();
  const { settings } = useSettingsStore();

  const timeoutMinutes = Number(settings['security.session_timeout_minutes']) || 60;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isAuthenticated || timeoutMinutes <= 0) return;

    const timeoutMs = timeoutMinutes * 60 * 1000;

    const resetTimer = (): void => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        showToast('warning', `Session timed out after ${String(timeoutMinutes)} minutes of inactivity.`);
        void logout();
      }, timeoutMs);
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    events.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    resetTimer();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [isAuthenticated, timeoutMinutes, logout]);

  const toggleSidebar = (): void => {
    setIsCollapsed((prev) => !prev);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden dark:bg-gray-800 bg-surface-muted text-slate-900 font-sans">
      <Sidebar isCollapsed={isCollapsed} onToggle={toggleSidebar} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header appInfo={appInfo} onToggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
      <ActivationModal />
    </div>
  );
}
