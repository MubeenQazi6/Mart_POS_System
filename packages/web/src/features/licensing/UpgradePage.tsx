import React, { useState } from 'react';
import {
  Check,
  Sparkles,
  Zap,
  Laptop,
  Globe,
  Database,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

export function UpgradePage(): React.JSX.Element {
  const { user } = useAuthStore();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<string>('pro');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const plans = [
    {
      id: 'starter',
      name: 'Starter Mart',
      badge: 'Single Counter',
      desc: 'Ideal for small retail shops, convenience stores, or solo counters.',
      priceMonthly: 15,
      priceYearly: 12,
      features: [
        '1 Desktop or Web Counter',
        'Up to 1,500 Products & Barcodes',
        'Daily Cloud DB Backup',
        'Offline Mode with Auto-Sync',
        'Standard Thermal Receipt Printing',
        'Sales & Inventory Reports',
      ],
      popular: false,
    },
    {
      id: 'pro',
      name: 'Pro Multi-Counter',
      badge: 'Most Popular',
      desc: 'For growing supermarkets, marts & stores needing multi-counter sync.',
      priceMonthly: 29,
      priceYearly: 24,
      features: [
        'Up to 5 Synchronized Counters',
        'Unlimited Products & Categories',
        'Real-time Supabase Cloud DB Sync',
        'Seamless Desktop & Web Licensing (Like Cursor)',
        'Customer Credit Ledger & WhatsApp Invoicing',
        'Barcode Label Designer & Sticker Printing',
        'Supplier Ledger & Purchase Orders',
        'Cash Drawer & Shift Management',
      ],
      popular: true,
    },
    {
      id: 'enterprise',
      name: 'Chain & Enterprise',
      badge: 'Multi-Branch',
      desc: 'For multi-branch marts, universities, schools & ERP management.',
      priceMonthly: 59,
      priceYearly: 49,
      features: [
        'Unlimited POS Counters & Branches',
        'Multi-Store Inventory Distribution',
        'Dedicated Cloud PostgreSQL Database',
        'Cross-Branch Consolidated Accounting',
        'ERP & Management Hub Access (Moodle / School / Marts)',
        'Custom Role Permissions & Audit Trails',
        'Dedicated 24/7 Account Manager',
      ],
      popular: false,
    },
  ];

  const handleCheckout = (planId: string): void => {
    setIsProcessing(true);
    // Simulate or trigger Stripe Checkout Session
    setTimeout(() => {
      alert(
        `🎉 Subscribed to ${planId.toUpperCase()} plan!\n\nYour account (${user?.username ?? 'user'}) has been upgraded.\nYour desktop app will automatically detect this license on startup!`,
      );
      setIsProcessing(false);
    }, 1200);
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Hero header */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.375rem 0.875rem',
            background: 'rgba(240, 147, 42, 0.12)',
            border: '1px solid rgba(240, 147, 42, 0.25)',
            borderRadius: '999px',
            color: '#f7a83e',
            fontSize: '0.8125rem',
            fontWeight: 700,
            marginBottom: '1rem',
          }}
        >
          <Sparkles size={14} />
          <span>Automatic Multi-Device Licensing</span>
        </div>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 900, color: 'white', letterSpacing: '-0.025em', margin: 0 }}>
          Scale Your Mart with Cloud SaaS Plans
        </h1>
        <p style={{ color: '#97a3b3', fontSize: '1rem', maxWidth: '650px', margin: '0.75rem auto 0' }}>
          Subscribe once on the web — your desktop POS automatically unlocks without typing any license keys.
          Works completely offline and syncs in real-time when connected.
        </p>

        {/* Billing cycle toggle */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: '#131921',
            padding: '0.25rem',
            borderRadius: '0.5rem',
            border: '1px solid #1b2530',
            marginTop: '1.5rem',
          }}
        >
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '0.375rem',
              border: 'none',
              background: billingCycle === 'monthly' ? '#f0932a' : 'transparent',
              color: billingCycle === 'monthly' ? '#131921' : '#97a3b3',
              fontWeight: 700,
              fontSize: '0.8125rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Monthly Billing
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('yearly')}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '0.375rem',
              border: 'none',
              background: billingCycle === 'yearly' ? '#f0932a' : 'transparent',
              color: billingCycle === 'yearly' ? '#131921' : '#97a3b3',
              fontWeight: 700,
              fontSize: '0.8125rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Yearly (Save 20%)
          </button>
        </div>
      </div>

      {/* Plan Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
          gap: '1.5rem',
          marginBottom: '3rem',
        }}
      >
        {plans.map((plan) => {
          const isSelected = selectedPlan === plan.id;
          const price = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;

          return (
            <div
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              style={{
                background: '#131921',
                borderRadius: '1rem',
                border: plan.popular
                  ? '2px solid #f0932a'
                  : isSelected
                    ? '2px solid #3b4a5e'
                    : '1px solid #1b2530',
                padding: '2rem',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: plan.popular ? '0 12px 30px rgba(240, 147, 42, 0.15)' : 'none',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, border-color 0.2s ease',
              }}
            >
              {plan.popular && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'linear-gradient(135deg, #f7a83e, #f0932a)',
                    color: '#131921',
                    fontSize: '0.6875rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '999px',
                    boxShadow: '0 4px 10px rgba(240, 147, 42, 0.3)',
                  }}
                >
                  {plan.badge}
                </div>
              )}

              <div style={{ marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', margin: 0 }}>
                  {plan.name}
                </h3>
                <p style={{ color: '#97a3b3', fontSize: '0.8125rem', marginTop: '0.375rem', minHeight: '38px' }}>
                  {plan.desc}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.375rem', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '2.5rem', fontWeight: 900, color: 'white' }}>
                  ${price}
                </span>
                <span style={{ color: '#97a3b3', fontSize: '0.875rem' }}>/ month</span>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCheckout(plan.id);
                }}
                disabled={isProcessing}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  background: plan.popular ? '#f0932a' : '#1b2530',
                  color: plan.popular ? '#131921' : 'white',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: isProcessing ? 'wait' : 'pointer',
                  marginBottom: '1.75rem',
                  transition: 'opacity 0.2s',
                  boxShadow: plan.popular ? '0 4px 12px rgba(240, 147, 42, 0.25)' : 'none',
                }}
              >
                {isProcessing && selectedPlan === plan.id
                  ? 'Connecting Stripe...'
                  : plan.popular
                    ? 'Start Pro Plan'
                    : `Choose ${plan.name}`}
              </button>

              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#c3cad3',
                    marginBottom: '0.75rem',
                  }}
                >
                  Features Included:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {plan.features.map((feat, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                      <div
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          background: 'rgba(22, 163, 74, 0.15)',
                          color: '#4ade80',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: '2px',
                        }}
                      >
                        <Check size={11} strokeWidth={3} />
                      </div>
                      <span style={{ fontSize: '0.8125rem', color: '#c3cad3' }}>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cursor-like Experience Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1b2530 0%, #131921 100%)',
          borderRadius: '1rem',
          border: '1px solid #3b4a5e',
          padding: '2rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f0932a', fontWeight: 700, marginBottom: '0.5rem' }}>
            <Zap size={18} />
            <span>HOW THE ZERO-KEY SYSTEM WORKS</span>
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', margin: 0 }}>
            Buy on Web, Run Everywhere
          </h2>
          <p style={{ color: '#97a3b3', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            You will never have to copy, paste, or email license keys again. When you purchase a plan on the web,
            our cloud database attaches the license to your Google/mart account.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#0d1218', padding: '0.75rem 1rem', borderRadius: '0.5rem' }}>
            <Globe size={18} style={{ color: '#f0932a' }} />
            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'white' }}>1. Subscribe on Web</div>
              <div style={{ fontSize: '0.75rem', color: '#97a3b3' }}>Select plan & pay securely via card</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#0d1218', padding: '0.75rem 1rem', borderRadius: '0.5rem' }}>
            <Database size={18} style={{ color: '#4ade80' }} />
            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'white' }}>2. Cloud Synced in Seconds</div>
              <div style={{ fontSize: '0.75rem', color: '#97a3b3' }}>Supabase updates license status immediately</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#0d1218', padding: '0.75rem 1rem', borderRadius: '0.5rem' }}>
            <Laptop size={18} style={{ color: '#38bdf8' }} />
            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'white' }}>3. Desktop Automatically Unlocks</div>
              <div style={{ fontSize: '0.75rem', color: '#97a3b3' }}>Open desktop app — full access without keys</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
