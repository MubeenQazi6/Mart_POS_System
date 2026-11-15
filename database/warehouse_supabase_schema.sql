-- ==============================================================================
-- WAREHOUSE-OS — DEDICATED SUPABASE POSTGRESQL SCHEMA
-- Zero-Conflict Dedicated Architecture for Logistics & Supply Chain
-- ==============================================================================

-- 1. Warehouse Logistics Hubs
CREATE TABLE IF NOT EXISTS public.warehouse_hubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  hub_code TEXT NOT NULL,                         -- e.g. 'HUB-KHI-01'
  name TEXT NOT NULL,                             -- e.g. 'Central Distribution Hub — Karachi'
  address TEXT,
  city TEXT DEFAULT 'Karachi',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Storage Bins & Coordinate Matrix
CREATE TABLE IF NOT EXISTS public.warehouse_bins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  hub_id UUID REFERENCES public.warehouse_hubs(id) ON DELETE SET NULL,
  code TEXT NOT NULL,                             -- e.g. 'A-01-01'
  zone TEXT NOT NULL,                             -- 'Zone A (Fast Moving)', 'Zone B', etc.
  aisle TEXT NOT NULL,
  rack TEXT NOT NULL,
  shelf TEXT NOT NULL,
  bin TEXT NOT NULL,
  max_weight_kg NUMERIC(10, 2) NOT NULL DEFAULT 500.00,
  current_weight_kg NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'available',       -- 'available', 'occupied', 'full', 'maintenance'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Warehouse Master Stock & Batch Lot Inventory
CREATE TABLE IF NOT EXISTS public.warehouse_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  hub_id UUID REFERENCES public.warehouse_hubs(id) ON DELETE SET NULL,
  bin_id UUID REFERENCES public.warehouse_bins(id) ON DELETE SET NULL,
  sku TEXT NOT NULL,
  barcode TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  reserved_quantity INT NOT NULL DEFAULT 0,
  min_threshold INT NOT NULL DEFAULT 10,
  unit TEXT NOT NULL DEFAULT 'pcs',
  batch_lot TEXT,
  expiry_date DATE,
  cost_price_minor INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Goods Received Notes (Inbound GRN)
CREATE TABLE IF NOT EXISTS public.warehouse_grn (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  hub_id UUID REFERENCES public.warehouse_hubs(id) ON DELETE SET NULL,
  grn_number TEXT NOT NULL UNIQUE,                -- e.g. 'GRN-2026-001'
  po_number TEXT NOT NULL,                        -- e.g. 'PO-9821'
  supplier_name TEXT NOT NULL,
  carrier TEXT,
  tracking_number TEXT,
  status TEXT NOT NULL DEFAULT 'completed',       -- 'draft', 'inspecting', 'completed', 'rejected'
  received_by TEXT NOT NULL,
  total_items INT NOT NULL DEFAULT 0,
  notes TEXT,
  received_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. GRN Line Items
CREATE TABLE IF NOT EXISTS public.warehouse_grn_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_id UUID REFERENCES public.warehouse_grn(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  expected_qty INT NOT NULL DEFAULT 0,
  received_qty INT NOT NULL DEFAULT 0,
  rejected_qty INT NOT NULL DEFAULT 0,
  bin_id UUID REFERENCES public.warehouse_bins(id) ON DELETE SET NULL,
  batch_lot TEXT,
  expiry_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Stock Transfer Orders (Outbound to Stores)
CREATE TABLE IF NOT EXISTS public.warehouse_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  hub_id UUID REFERENCES public.warehouse_hubs(id) ON DELETE SET NULL,
  transfer_number TEXT NOT NULL UNIQUE,           -- e.g. 'TR-2026-001'
  destination_store TEXT NOT NULL,                -- e.g. 'Gulshan Mega Mart'
  priority TEXT NOT NULL DEFAULT 'medium',        -- 'normal' | 'medium' | 'urgent'
  status TEXT NOT NULL DEFAULT 'draft',           -- 'draft' | 'picking' | 'in_transit' | 'delivered' | 'cancelled'
  vehicle_number TEXT,
  driver_name TEXT,
  created_by TEXT NOT NULL,
  total_units INT NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  dispatched_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);

-- 7. Transfer Line Items
CREATE TABLE IF NOT EXISTS public.warehouse_transfer_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID REFERENCES public.warehouse_transfers(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  source_bin_id UUID REFERENCES public.warehouse_bins(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Enable Row Level Security (RLS)
ALTER TABLE public.warehouse_hubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_bins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_grn ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_grn_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_transfer_items ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies (Isolated to authenticated user's organization)
CREATE POLICY "Warehouse Hubs Access" ON public.warehouse_hubs
  FOR ALL USING (org_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid()));

CREATE POLICY "Warehouse Bins Access" ON public.warehouse_bins
  FOR ALL USING (org_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid()));

CREATE POLICY "Warehouse Stock Access" ON public.warehouse_stock
  FOR ALL USING (org_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid()));

CREATE POLICY "Warehouse GRN Access" ON public.warehouse_grn
  FOR ALL USING (org_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid()));

CREATE POLICY "Warehouse Transfers Access" ON public.warehouse_transfers
  FOR ALL USING (org_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid()));
