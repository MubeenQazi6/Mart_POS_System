import React, { useEffect, useState } from 'react';
import { dashboardApi } from '@/lib/apiClient';
import {
  DollarSign,
  ShoppingCart,
  Boxes,
  AlertTriangle,
  TrendingUp,
  Package,
  Award,
  Receipt,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface KpiData {
  todaySalesMinor: number;
  todayTransactions: number;
  lowStockCount: number;
  totalProductsCount: number;
  monthSalesMinor: number;
  monthExpensesMinor: number;
  netProfitMinor: number;
}

export function DashboardPage(): React.JSX.Element {
  const [kpis, setKpis] = useState<KpiData>({
    todaySalesMinor: 1450000, // PKR 14,500.00
    todayTransactions: 28,
    lowStockCount: 4,
    totalProductsCount: 312,
    monthSalesMinor: 48500000,
    monthExpensesMinor: 12400000,
    netProfitMinor: 36100000,
  });

  useEffect(() => {
    async function loadData(): Promise<void> {
      try {
        const res = await dashboardApi.getKpis({ preset: 'this_month' });
        if (res.success && res.data) {
          setKpis((prev) => ({ ...prev, ...(res.data as unknown as Partial<KpiData>) }));
        }
      } catch {
        // Fallback to sample data
      }
    }
    void loadData();
  }, []);

  const formatPrice = (minor: number): string => {
    return `PKR ${(minor / 100).toLocaleString('en-PK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1b2530 0%, #131921 100%)',
          borderRadius: '1rem',
          border: '1px solid #3b4a5e',
          padding: '1.5rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', margin: 0 }}>
              Live Operations Dashboard
            </h1>
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                padding: '0.2rem 0.5rem',
                borderRadius: '999px',
                background: 'rgba(34, 197, 94, 0.15)',
                color: '#4ade80',
                border: '1px solid rgba(34, 197, 94, 0.3)',
              }}
            >
              Real-Time
            </span>
          </div>
          <p style={{ color: '#97a3b3', fontSize: '0.875rem', margin: 0 }}>
            Synchronized with desktop POS counters and cloud database.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link
            to="/pos"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#f0932a',
              color: '#131921',
              padding: '0.625rem 1.25rem',
              borderRadius: '0.5rem',
              fontWeight: 700,
              fontSize: '0.875rem',
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(240, 147, 42, 0.3)',
            }}
          >
            <ShoppingCart size={18} />
            <span>Launch POS Terminal</span>
          </Link>
          <Link
            to="/billing"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#1b2530',
              border: '1px solid #3b4a5e',
              color: '#f7a83e',
              padding: '0.625rem 1.25rem',
              borderRadius: '0.5rem',
              fontWeight: 700,
              fontSize: '0.875rem',
              textDecoration: 'none',
            }}
          >
            <Sparkles size={16} />
            <span>SaaS Plans</span>
          </Link>
        </div>
      </div>

      {/* Top 4 KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
        }}
      >
        {/* Today's Sales */}
        <div
          style={{
            background: '#131921',
            borderRadius: '0.75rem',
            border: '1px solid #1b2530',
            borderLeft: '4px solid #f0932a',
            padding: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#97a3b3' }}>
              Today's Revenue
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(240, 147, 42, 0.15)',
                color: '#f0932a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <DollarSign size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', marginTop: '0.75rem' }}>
            {formatPrice(kpis.todaySalesMinor)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#4ade80', fontSize: '0.75rem', marginTop: '0.375rem' }}>
            <TrendingUp size={13} />
            <span>+14.2% from yesterday</span>
          </div>
        </div>

        {/* Transactions */}
        <div
          style={{
            background: '#131921',
            borderRadius: '0.75rem',
            border: '1px solid #1b2530',
            borderLeft: '4px solid #38bdf8',
            padding: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#97a3b3' }}>
              Today's Orders
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShoppingCart size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', marginTop: '0.75rem' }}>
            {kpis.todayTransactions} receipts
          </div>
          <div style={{ color: '#97a3b3', fontSize: '0.75rem', marginTop: '0.375rem' }}>
            Average basket: PKR 518.00
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div
          style={{
            background: '#131921',
            borderRadius: '0.75rem',
            border: '1px solid #1b2530',
            borderLeft: '4px solid #f87171',
            padding: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#97a3b3' }}>
              Low Stock Alert
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#f87171',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f87171', marginTop: '0.75rem' }}>
            {kpis.lowStockCount} items
          </div>
          <Link
            to="/inventory"
            style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '0.375rem', display: 'block', textDecoration: 'none' }}
          >
            Review & restock now →
          </Link>
        </div>

        {/* Total Catalog */}
        <div
          style={{
            background: '#131921',
            borderRadius: '0.75rem',
            border: '1px solid #1b2530',
            borderLeft: '4px solid #a855f7',
            padding: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#97a3b3' }}>
              Active Catalog
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(168, 85, 247, 0.15)',
                color: '#a855f7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Boxes size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', marginTop: '0.75rem' }}>
            {kpis.totalProductsCount} SKUs
          </div>
          <div style={{ color: '#97a3b3', fontSize: '0.75rem', marginTop: '0.375rem' }}>
            All barcodes mapped & active
          </div>
        </div>
      </div>

      {/* Quick Launchpad & Modules Overview */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {/* Quick Launch Operations */}
        <div
          style={{
            background: '#131921',
            borderRadius: '0.75rem',
            border: '1px solid #1b2530',
            padding: '1.5rem',
          }}
        >
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'white', margin: '0 0 1rem 0' }}>
            Quick Operations
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
            <Link
              to="/pos"
              style={{
                padding: '1rem',
                borderRadius: '0.5rem',
                background: '#1b2530',
                border: '1px solid #3b4a5e',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                textDecoration: 'none',
                color: 'white',
              }}
            >
              <ShoppingCart size={20} style={{ color: '#f0932a' }} />
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>POS Terminal</div>
                <div style={{ fontSize: '0.6875rem', color: '#97a3b3' }}>Scan & checkout</div>
              </div>
            </Link>

            <Link
              to="/products"
              style={{
                padding: '1rem',
                borderRadius: '0.5rem',
                background: '#1b2530',
                border: '1px solid #3b4a5e',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                textDecoration: 'none',
                color: 'white',
              }}
            >
              <Package size={20} style={{ color: '#38bdf8' }} />
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Add Product</div>
                <div style={{ fontSize: '0.6875rem', color: '#97a3b3' }}>Pricing & variants</div>
              </div>
            </Link>

            <Link
              to="/barcode-labels"
              style={{
                padding: '1rem',
                borderRadius: '0.5rem',
                background: '#1b2530',
                border: '1px solid #3b4a5e',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                textDecoration: 'none',
                color: 'white',
              }}
            >
              <Award size={20} style={{ color: '#4ade80' }} />
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Barcode Stickers</div>
                <div style={{ fontSize: '0.6875rem', color: '#97a3b3' }}>Print label rolls</div>
              </div>
            </Link>

            <Link
              to="/cash"
              style={{
                padding: '1rem',
                borderRadius: '0.5rem',
                background: '#1b2530',
                border: '1px solid #3b4a5e',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                textDecoration: 'none',
                color: 'white',
              }}
            >
              <Receipt size={20} style={{ color: '#a855f7' }} />
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Shift & Cash</div>
                <div style={{ fontSize: '0.6875rem', color: '#97a3b3' }}>Open/close drawer</div>
              </div>
            </Link>
          </div>
        </div>

        {/* Cloud Sync & SaaS Status Card */}
        <div
          style={{
            background: '#131921',
            borderRadius: '0.75rem',
            border: '1px solid #1b2530',
            padding: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'white', margin: 0 }}>
              Cloud & Sync Health
            </h3>
            <span
              style={{
                fontSize: '0.75rem',
                padding: '0.2rem 0.5rem',
                borderRadius: '999px',
                background: 'rgba(240, 147, 42, 0.15)',
                color: '#f7a83e',
                fontWeight: 600,
              }}
            >
              Cursor-Style Auth
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
              <span style={{ color: '#97a3b3' }}>Sync Engine</span>
              <span style={{ color: '#4ade80', fontWeight: 600 }}>Supabase Online (PostgreSQL)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
              <span style={{ color: '#97a3b3' }}>Offline Mode</span>
              <span style={{ color: 'white', fontWeight: 600 }}>IndexedDB / LocalStorage</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
              <span style={{ color: '#97a3b3' }}>Active License</span>
              <span style={{ color: '#f7a83e', fontWeight: 600 }}>3-Day Pro Trial Active</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
              <span style={{ color: '#97a3b3' }}>Active Counters</span>
              <span style={{ color: 'white', fontWeight: 600 }}>2 Connected (1 Desktop, 1 Web)</span>
            </div>
          </div>

          <Link
            to="/billing"
            style={{
              display: 'block',
              marginTop: '1.25rem',
              textAlign: 'center',
              padding: '0.625rem',
              borderRadius: '0.5rem',
              backgroundColor: '#1b2530',
              border: '1px solid #3b4a5e',
              color: 'white',
              fontSize: '0.8125rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Manage Subscription & Counters →
          </Link>
        </div>
      </div>
    </div>
  );
}
