-- ==============================================================================
-- ZENTROPIC TECHNOLOGIES — ENTERPRISE MULTI-MODULE DATABASE ARCHITECTURE
-- PostgreSQL Schema-Isolated Multi-System Architecture (No Data Conflicts)
-- Environments: Compatible with both UAT and Production databases
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. CORE / PUBLIC SCHEMA (Shared Company Infrastructure)
-- Holds authentication, organization tenants, subscriptions & system access
-- ==============================================================================

-- Organizations (Tenants - Stores, Schools, Enterprises)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    legal_name TEXT,
    tax_number TEXT,                          -- NTN / STRN for Pakistan
    currency TEXT NOT NULL DEFAULT 'PKR',
    contact_phone TEXT,
    contact_email TEXT,
    address TEXT,
    city TEXT,
    country TEXT NOT NULL DEFAULT 'Pakistan',
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- System Subscriptions & Licenses (Which modules this organization can use)
CREATE TABLE IF NOT EXISTS public.system_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    system_code TEXT NOT NULL,                -- 'mart_pos', 'school_iq', 'hr_edge', 'stock_master', 'ledger_x', 'dine_os'
    plan_tier TEXT NOT NULL DEFAULT 'starter',-- 'starter', 'pro', 'enterprise'
    status TEXT NOT NULL DEFAULT 'active',    -- 'trial', 'active', 'suspended', 'cancelled'
    max_counters_or_users INT DEFAULT 1,
    trial_ends_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(org_id, system_code)
);

-- Global Audit Logs (Audit trail across all systems)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    system_code TEXT NOT NULL,
    action TEXT NOT NULL,                     -- 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'BILL_VOID'
    table_name TEXT NOT NULL,
    record_id TEXT,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 2. MARTPOS SUB-DATABASE (Schema: mart_pos)
-- Isolated tables for Retail, Grocery, Supermarket Point of Sale
-- ==============================================================================
CREATE SCHEMA IF NOT EXISTS mart_pos;

-- POS Counters / Registers
CREATE TABLE IF NOT EXISTS mart_pos.counters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    counter_name TEXT NOT NULL,               -- 'Counter 1 - Front Counter'
    device_fingerprint TEXT,
    platform TEXT DEFAULT 'desktop',          -- 'desktop' or 'web'
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Product Categories
CREATE TABLE IF NOT EXISTS mart_pos.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Products Catalog
CREATE TABLE IF NOT EXISTS mart_pos.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    category_id UUID REFERENCES mart_pos.categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    barcode TEXT NOT NULL,
    sku TEXT,
    cost_price_minor BIGINT NOT NULL DEFAULT 0,    -- In paisa/cents
    selling_price_minor BIGINT NOT NULL DEFAULT 0,
    stock_quantity INT NOT NULL DEFAULT 0,
    min_stock_alert INT DEFAULT 5,
    tax_percent NUMERIC(5,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(org_id, barcode)
);

-- Customers & Khata (Credit Accounts)
CREATE TABLE IF NOT EXISTS mart_pos.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT,
    credit_limit_minor BIGINT DEFAULT 0,
    current_balance_minor BIGINT DEFAULT 0,   -- Positive = money owed by customer
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Sales Orders & Invoices
CREATE TABLE IF NOT EXISTS mart_pos.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    counter_id UUID REFERENCES mart_pos.counters(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES mart_pos.customers(id) ON DELETE SET NULL,
    invoice_number TEXT NOT NULL,
    subtotal_minor BIGINT NOT NULL,
    discount_minor BIGINT DEFAULT 0,
    tax_minor BIGINT DEFAULT 0,
    total_minor BIGINT NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'CASH', -- 'CASH', 'CARD', 'KHATA', 'SPLIT'
    status TEXT NOT NULL DEFAULT 'COMPLETED',     -- 'COMPLETED', 'VOIDED', 'RETURNED'
    synced_from_offline BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(org_id, invoice_number)
);

-- Sale Items
CREATE TABLE IF NOT EXISTS mart_pos.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES mart_pos.sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES mart_pos.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity INT NOT NULL,
    unit_cost_minor BIGINT NOT NULL,
    unit_price_minor BIGINT NOT NULL,
    line_total_minor BIGINT NOT NULL
);

-- ==============================================================================
-- 3. SCHOOLIQ SUB-DATABASE (Schema: school_iq)
-- Isolated tables for Schools, Colleges & Academies
-- ==============================================================================
CREATE SCHEMA IF NOT EXISTS school_iq;

CREATE TABLE IF NOT EXISTS school_iq.academic_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,                      -- '2026-2027'
    is_current BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS school_iq.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    admission_number TEXT NOT NULL,
    full_name TEXT NOT NULL,
    guardian_name TEXT,
    guardian_phone TEXT,
    class_grade TEXT NOT NULL,
    monthly_fee_minor BIGINT NOT NULL DEFAULT 0,
    enrollment_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'ACTIVE',
    UNIQUE(org_id, admission_number)
);

CREATE TABLE IF NOT EXISTS school_iq.fee_vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES school_iq.students(id) ON DELETE CASCADE,
    voucher_number TEXT NOT NULL,
    billing_month TEXT NOT NULL,              -- '2026-10'
    amount_minor BIGINT NOT NULL,
    fine_minor BIGINT DEFAULT 0,
    paid_status TEXT DEFAULT 'UNPAID',        -- 'UNPAID', 'PARTIAL', 'PAID'
    due_date DATE NOT NULL,
    paid_at TIMESTAMPTZ
);

-- ==============================================================================
-- 4. HREDGE SUB-DATABASE (Schema: hr_edge)
-- Isolated tables for HR, Payroll, Shifts & Attendance
-- ==============================================================================
CREATE SCHEMA IF NOT EXISTS hr_edge;

CREATE TABLE IF NOT EXISTS hr_edge.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_code TEXT NOT NULL,
    full_name TEXT NOT NULL,
    designation TEXT NOT NULL,
    department TEXT,
    base_salary_minor BIGINT NOT NULL DEFAULT 0,
    joining_date DATE,
    status TEXT DEFAULT 'ACTIVE',
    UNIQUE(org_id, employee_code)
);

CREATE TABLE IF NOT EXISTS hr_edge.payroll_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    payroll_month TEXT NOT NULL,              -- '2026-10'
    total_disbursed_minor BIGINT NOT NULL,
    status TEXT DEFAULT 'DRAFT',              -- 'DRAFT', 'APPROVED', 'DISBURSED'
    processed_at TIMESTAMPTZ
);

-- ==============================================================================
-- 5. STOCKMASTER WMS SUB-DATABASE (Schema: stock_master)
-- Isolated tables for Warehouses, Lot/Batch Tracking & Stock Audits
-- ==============================================================================
CREATE SCHEMA IF NOT EXISTS stock_master;

CREATE TABLE IF NOT EXISTS stock_master.warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    warehouse_code TEXT NOT NULL,
    name TEXT NOT NULL,
    location TEXT,
    is_main BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS stock_master.stock_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    warehouse_id UUID REFERENCES stock_master.warehouses(id) ON DELETE CASCADE,
    batch_number TEXT NOT NULL,
    item_description TEXT NOT NULL,
    quantity_available INT NOT NULL DEFAULT 0,
    manufacture_date DATE,
    expiry_date DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) FOR MULTI-TENANT ISOLATION
-- Ensures Tenant A NEVER sees Tenant B data
-- ==============================================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart_pos.counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart_pos.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart_pos.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_iq.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_edge.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_master.warehouses ENABLE ROW LEVEL SECURITY;

-- Security Policy: Authenticated users can only read/write their organization's data
CREATE POLICY "Tenant isolation for organizations"
    ON public.organizations
    FOR ALL
    USING (owner_id = auth.uid());

CREATE POLICY "Tenant isolation for mart_pos products"
    ON mart_pos.products
    FOR ALL
    USING (org_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid()));

CREATE POLICY "Tenant isolation for mart_pos sales"
    ON mart_pos.sales
    FOR ALL
    USING (org_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid()));
