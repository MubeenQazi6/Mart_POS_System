-- ==============================================================================
-- MARTPOS CLOUD — SUPABASE POSTGRESQL SCHEMA
-- Free-tier compatible: Multi-Tenant, Zero-Key Licensing, Multi-Counter Sync
-- ==============================================================================

-- 1. Organizations (Each mart / store account)
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Subscriptions (Cursor-Style SaaS Licensing)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  system_slug TEXT NOT NULL DEFAULT 'mart_pos', -- 'mart_pos', 'school_mgmt', etc.
  plan TEXT NOT NULL DEFAULT 'trial',          -- 'trial', 'starter', 'pro', 'enterprise'
  status TEXT NOT NULL DEFAULT 'active',        -- 'active', 'expired', 'cancelled'
  trial_ends_at TIMESTAMPTZ DEFAULT (now() + interval '3 days'),
  current_period_end TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  max_counters INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Counters (Multiple POS terminal synchronization)
CREATE TABLE IF NOT EXISTS public.counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  counter_name TEXT NOT NULL,                  -- e.g. 'Counter 1 - Main Exit'
  device_fingerprint TEXT,                     -- Desktop Machine Fingerprint
  counter_type TEXT DEFAULT 'desktop',         -- 'desktop' or 'web'
  is_active BOOLEAN DEFAULT true,
  last_heartbeat TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Cloud Products Catalog (Synced across counters)
CREATE TABLE IF NOT EXISTS public.cloud_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  barcode TEXT NOT NULL,
  category TEXT,
  cost_price_minor INT NOT NULL DEFAULT 0,
  selling_price_minor INT NOT NULL DEFAULT 0,
  stock_quantity INT NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Cloud Sales Invoices (Auto-sync from all counters)
CREATE TABLE IF NOT EXISTS public.cloud_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  counter_id UUID REFERENCES public.counters(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  subtotal_minor INT NOT NULL,
  tax_minor INT NOT NULL DEFAULT 0,
  discount_minor INT NOT NULL DEFAULT 0,
  grand_total_minor INT NOT NULL,
  tender_type TEXT NOT NULL DEFAULT 'CASH',     -- 'CASH', 'CARD', 'ONLINE'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Offline-First Sync Log (Delta synchronization)
CREATE TABLE IF NOT EXISTS public.sync_log (
  id BIGSERIAL PRIMARY KEY,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,                    -- 'products', 'sales', 'customers'
  record_id TEXT NOT NULL,
  action TEXT NOT NULL,                        -- 'INSERT', 'UPDATE', 'DELETE'
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security (RLS)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloud_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloud_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_log ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only view & modify their own organization data
CREATE POLICY "Users access own org" ON public.organizations
  FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Users access own sub" ON public.subscriptions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users access own products" ON public.cloud_products
  FOR ALL USING (org_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid()));

CREATE POLICY "Users access own sales" ON public.cloud_sales
  FOR ALL USING (org_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid()));
