import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  PanelLeft,
  Clock,
  LogOut,
  User,
  Wifi,
  WifiOff,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps): React.JSX.Element {
  const location = useLocation();
  const [time, setTime] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { user, logout } = useAuthStore();

  useEffect(() => {
    const updateTime = (): void => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);

    const handleOnline = (): void => setIsOnline(true);
    const handleOffline = (): void => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Format title from path
  const getPageTitle = (path: string): string => {
    const segment = path.replace('/', '').split('/')[0];
    if (!segment) return 'Dashboard';
    return segment
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  return (
    <header
      style={{
        height: '60px',
        backgroundColor: '#131921',
        borderBottom: '1px solid #1b2530',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.25rem',
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      {/* Left side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          type="button"
          onClick={onToggleSidebar}
          style={{
            background: '#1b2530',
            border: 'none',
            color: '#c3cad3',
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          title="Toggle Navigation"
        >
          <PanelLeft size={18} />
        </button>

        <div>
          <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'white', margin: 0 }}>
            {getPageTitle(location.pathname)}
          </h2>
        </div>
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Sync status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.25rem 0.625rem',
            borderRadius: '999px',
            backgroundColor: isOnline ? 'rgba(22, 163, 74, 0.15)' : 'rgba(220, 38, 38, 0.15)',
            border: `1px solid ${isOnline ? 'rgba(22, 163, 74, 0.3)' : 'rgba(220, 38, 38, 0.3)'}`,
            color: isOnline ? '#4ade80' : '#f87171',
            fontSize: '0.75rem',
            fontWeight: 600,
          }}
        >
          {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
          <span>{isOnline ? 'Cloud Synced' : 'Offline Mode'}</span>
        </div>

        {/* Upgrade / Plan CTA */}
        <Link
          to="/billing"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.3125rem 0.75rem',
            borderRadius: '0.375rem',
            backgroundColor: '#f0932a',
            color: '#131921',
            fontSize: '0.75rem',
            fontWeight: 700,
            textDecoration: 'none',
            boxShadow: '0 2px 6px rgba(240, 147, 42, 0.25)',
          }}
        >
          <Sparkles size={13} />
          <span>SaaS Plans</span>
        </Link>

        {/* Clock */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            color: '#97a3b3',
            fontSize: '0.8125rem',
            fontWeight: 500,
          }}
        >
          <Clock size={15} />
          <span>{time}</span>
        </div>

        {/* User Profile */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            paddingLeft: '0.75rem',
            borderLeft: '1px solid #1b2530',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#1b2530',
              border: '1px solid #3b4a5e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f0932a',
            }}
          >
            <User size={16} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'white' }}>
              {user?.fullName || user?.username || 'Admin User'}
            </span>
            <span style={{ fontSize: '0.6875rem', color: '#f7a83e' }}>
              {user?.storeName ? `${user.storeName} • ${user.role}` : user?.role ?? 'Owner'}
            </span>
          </div>

          {/* Logout */}
          <button
            type="button"
            onClick={() => void logout()}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#5f7085',
              cursor: 'pointer',
              padding: '0.375rem',
              borderRadius: '0.375rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: '0.5rem',
            }}
            title="Log Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
