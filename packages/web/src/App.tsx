import { useEffect } from 'react';
import { HashRouter } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { LoginPage } from '@/features/auth/LoginPage';
import { AppShell } from '@/components/layout/AppShell';
import { AppRoutes } from '@/routes';
import { Crown, Loader2 } from 'lucide-react';

export default function App(): React.JSX.Element {
  const { isAuthenticated, isInitializing, initAuth } = useAuthStore();
  const { loadSettings } = useSettingsStore();

  useEffect(() => {
    void initAuth().then(() => {
      if (useAuthStore.getState().isAuthenticated) {
        void loadSettings();
      }
    });
  }, [initAuth, loadSettings]);

  if (isInitializing) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'var(--navy-900)',
          color: 'white',
          gap: '1rem',
        }}
      >
        <div
          style={{
            width: '4rem',
            height: '4rem',
            borderRadius: '1rem',
            background: 'linear-gradient(135deg, var(--brand-400), var(--brand-600))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--navy-800)',
          }}
        >
          <Crown size={28} strokeWidth={1.75} />
        </div>
        <div>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, letterSpacing: '-0.02em', textAlign: 'center' }}>
            MARTPOS
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--brand-400)', fontWeight: 600, textAlign: 'center', marginTop: '0.125rem' }}>
            RETAIL POS & INVENTORY SYSTEM
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'var(--navy-800)',
            padding: '0.375rem 1rem',
            borderRadius: '999px',
            fontSize: '0.75rem',
            color: 'var(--navy-300)',
            border: '1px solid var(--navy-700)',
          }}
        >
          <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} />
          <span>Connecting to server...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <HashRouter>
      <AppShell>
        <AppRoutes />
      </AppShell>
    </HashRouter>
  );
}
