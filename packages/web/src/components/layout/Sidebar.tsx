import React, { type ElementType } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Truck,
  Building2,
  Users,
  RotateCcw,
  Receipt,
  Wallet,
  BarChart3,
  Barcode,
  Settings,
  Crown,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  CreditCard,
} from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAuthStore } from '@/stores/authStore';

interface NavItem {
  id: string;
  name: string;
  path: string;
  icon: ElementType;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Operations',
    items: [
      { id: 'dashboard', name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { id: 'pos', name: 'Point of Sale', path: '/pos', icon: ShoppingCart },
    ],
  },
  {
    title: 'Catalog & Stock',
    items: [
      { id: 'products', name: 'Products', path: '/products', icon: Package },
      { id: 'inventory', name: 'Stock Levels', path: '/inventory', icon: Boxes },
      { id: 'barcode-labels', name: 'Barcode Labels', path: '/barcode-labels', icon: Barcode },
    ],
  },
  {
    title: 'Trade & Accounts',
    items: [
      { id: 'purchases', name: 'Purchases', path: '/purchases', icon: Truck },
      { id: 'suppliers', name: 'Suppliers', path: '/suppliers', icon: Building2 },
      { id: 'customers', name: 'Customers', path: '/customers', icon: Users },
      { id: 'returns', name: 'Returns', path: '/returns', icon: RotateCcw },
    ],
  },
  {
    title: 'Finance & Ledger',
    items: [
      { id: 'cash', name: 'Cash Register', path: '/cash', icon: Wallet },
      { id: 'expenses', name: 'Expenses', path: '/expenses', icon: Receipt },
      { id: 'reports', name: 'Reports', path: '/reports', icon: BarChart3 },
    ],
  },
  {
    title: 'Administration',
    items: [
      { id: 'users', name: 'Users & Roles', path: '/users', icon: Users },
      { id: 'settings', name: 'Settings', path: '/settings', icon: Settings },
      { id: 'billing', name: 'SaaS & Billing', path: '/billing', icon: CreditCard },
    ],
  },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps): React.JSX.Element {
  const { settings } = useSettingsStore();
  const { user } = useAuthStore();
  const storeName = user?.storeName || settings['store.name'] || 'MARTPOS';

  return (
    <aside
      style={{
        width: isCollapsed ? '72px' : '260px',
        backgroundColor: '#0d1218',
        borderRight: '1px solid #1b2530',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        flexShrink: 0,
        zIndex: 20,
        userSelect: 'none',
      }}
    >
      {/* Brand header */}
      <div
        style={{
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          padding: isCollapsed ? '0' : '0 1rem',
          borderBottom: '1px solid #1b2530',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #f7a83e, #f0932a)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#131921',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(240, 147, 42, 0.25)',
            }}
          >
            <Crown size={20} strokeWidth={2.2} />
          </div>
          {!isCollapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div
                style={{
                  color: 'white',
                  fontWeight: 900,
                  fontSize: '0.9375rem',
                  letterSpacing: '-0.02em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {storeName}
              </div>
              <div
                style={{
                  color: '#f0932a',
                  fontWeight: 600,
                  fontSize: '0.6875rem',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                Cloud POS & Sync
              </div>
            </div>
          )}
        </div>

        {!isCollapsed && (
          <button
            type="button"
            onClick={onToggle}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#5f7085',
              cursor: 'pointer',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '0.375rem',
            }}
            title="Collapse sidebar"
          >
            <ChevronLeft size={18} />
          </button>
        )}
      </div>

      {/* Nav list */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0.75rem 0.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        {NAV_SECTIONS.map((sec) => (
          <div key={sec.title}>
            {!isCollapsed && (
              <div
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: '#5f7085',
                  padding: '0.25rem 0.625rem',
                  marginBottom: '0.25rem',
                }}
              >
                {sec.title}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
              {sec.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    title={isCollapsed ? item.name : undefined}
                    style={({ isActive }) => ({
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: isCollapsed ? '0.625rem 0' : '0.5rem 0.75rem',
                      justifyContent: isCollapsed ? 'center' : 'flex-start',
                      borderRadius: '0.5rem',
                      color: isActive ? '#f0932a' : '#97a3b3',
                      backgroundColor: isActive ? 'rgba(240, 147, 42, 0.12)' : 'transparent',
                      textDecoration: 'none',
                      fontSize: '0.875rem',
                      fontWeight: isActive ? 600 : 500,
                      transition: 'all 0.15s ease',
                      borderLeft: isActive ? '3px solid #f0932a' : '3px solid transparent',
                    })}
                  >
                    <Icon size={18} strokeWidth={1.8} />
                    {!isCollapsed && <span>{item.name}</span>}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Trial / Cloud Status Footer */}
      {!isCollapsed ? (
        <div
          style={{
            margin: '0.75rem',
            padding: '0.75rem',
            borderRadius: '0.625rem',
            background: 'linear-gradient(135deg, rgba(240, 147, 42, 0.15), rgba(27, 37, 48, 0.8))',
            border: '1px solid rgba(240, 147, 42, 0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#f7a83e', fontSize: '0.75rem', fontWeight: 700 }}>
            <Sparkles size={14} />
            <span>3-Day Pro Trial Active</span>
          </div>
          <p style={{ color: '#97a3b3', fontSize: '0.6875rem', margin: '0.25rem 0 0.5rem' }}>
            Desktop & Web sync active. Buy plan to keep counters live.
          </p>
          <NavLink
            to="/billing"
            style={{
              display: 'block',
              textAlign: 'center',
              padding: '0.375rem',
              borderRadius: '0.375rem',
              backgroundColor: '#f0932a',
              color: '#131921',
              fontWeight: 700,
              fontSize: '0.75rem',
              textDecoration: 'none',
            }}
          >
            Upgrade Plan
          </NavLink>
        </div>
      ) : (
        <div style={{ padding: '0.75rem', display: 'flex', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={onToggle}
            style={{
              background: '#1b2530',
              border: 'none',
              color: '#97a3b3',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            title="Expand sidebar"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </aside>
  );
}
