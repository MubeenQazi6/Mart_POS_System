-- ==============================================================================
-- ZENTROPIC TECHNOLOGIES — ENTERPRISE DATABASE INDEXING & MULTI-TENANT ISOLATION
-- Migration 0014: High-Performance Composite Indexes & RLS Policy Hardening
-- ==============================================================================

-- 1. Products Performance Indexes
CREATE INDEX IF NOT EXISTS idx_cloud_products_tenant_active 
  ON public.cloud_products (org_id, is_active);

CREATE INDEX IF NOT EXISTS idx_cloud_products_tenant_barcode 
  ON public.cloud_products (org_id, barcode) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_cloud_products_tenant_low_stock 
  ON public.cloud_products (org_id, stock_quantity) WHERE is_active = true;

-- 2. Sales & Billing Performance Indexes
CREATE INDEX IF NOT EXISTS idx_cloud_sales_tenant_created 
  ON public.cloud_sales (org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cloud_sales_tenant_invoice 
  ON public.cloud_sales (org_id, invoice_number);

-- 3. Customers & Khata Indexes
CREATE INDEX IF NOT EXISTS idx_cloud_customers_tenant_phone 
  ON public.cloud_customers (org_id, phone);

CREATE INDEX IF NOT EXISTS idx_cloud_customers_tenant_balance 
  ON public.cloud_customers (org_id, current_balance_minor DESC) WHERE is_active = true;

-- 4. Suppliers & Payables Indexes
CREATE INDEX IF NOT EXISTS idx_cloud_suppliers_tenant_balance 
  ON public.cloud_suppliers (org_id, current_balance_minor DESC) WHERE is_active = true;

-- 5. Multi-Counter Sync & Heartbeat
CREATE INDEX IF NOT EXISTS idx_counters_tenant_active 
  ON public.counters (org_id, is_active, last_heartbeat DESC);

-- 6. Sync Log Delta Indexing
CREATE INDEX IF NOT EXISTS idx_sync_log_tenant_id 
  ON public.sync_log (org_id, id DESC);
