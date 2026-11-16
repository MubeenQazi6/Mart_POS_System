/**
 * Supabase Data Layer — MartPOS Cloud
 *
 * Direct Supabase queries replacing REST API calls in apiClient.ts.
 * All functions use RLS — the authenticated user can only access
 * their own organization's data.
 *
 * Financial values are integer minor units (paisa) — never float.
 */

import { getSupabase } from '@/lib/supabase';

// ─── Types ──────────────────────────────────────────────────────────────────

/** A product stored in the cloud_products table. */
export interface CloudProduct {
  id: string;
  org_id: string;
  name: string;
  barcode: string;
  category: string | null;
  cost_price_minor: number;
  selling_price_minor: number;
  stock_quantity: number;
  is_active: boolean;
  updated_at: string;
}

/** A sale invoice stored in the cloud_sales table. */
export interface CloudSale {
  id: string;
  org_id: string;
  counter_id: string | null;
  invoice_number: string;
  subtotal_minor: number;
  tax_minor: number;
  discount_minor: number;
  grand_total_minor: number;
  tender_type: string;
  created_at: string;
}

/** Customer stored in cloud_customers */
export interface CloudCustomer {
  id: string;
  org_id: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  credit_limit_minor: number;
  opening_balance_minor: number;
  current_balance_minor: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Supplier stored in cloud_suppliers */
export interface CloudSupplier {
  id: string;
  org_id: string;
  name: string;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  opening_balance_minor: number;
  current_balance_minor: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Expense stored in cloud_expenses */
export interface CloudExpense {
  id: string;
  org_id: string;
  expense_number: string;
  category_id: number;
  amount_minor: number;
  payment_method: string;
  description: string | null;
  expense_date: string;
  status: 'POSTED' | 'VOIDED';
  created_at: string;
  updated_at: string;
}

/** Expense category */
export interface CloudExpenseCategory {
  id: number;
  org_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Cash session stored in cloud_cash_sessions */
export interface CloudCashSession {
  id: string;
  org_id: string;
  business_date: string;
  opened_by: number | null;
  opened_at: string;
  opening_cash_minor: number;
  closed_by: number | null;
  closed_at: string | null;
  expected_cash_minor: number;
  actual_cash_minor: number | null;
  variance_minor: number;
  status: 'OPEN' | 'CLOSED';
}

/** Cash movement */
export interface CloudCashMovement {
  id: string;
  org_id: string;
  session_id: number;
  movement_type: string;
  amount_minor: number;
  reference_type: string | null;
  reference_id: number | null;
  description: string | null;
  created_at: string;
}

/** Stock movement */
export interface CloudStockMovement {
  id: string;
  org_id: string;
  variant_id: number;
  product_name: string | null;
  movement_type: string;
  direction: 'in' | 'out';
  quantity: number;
  unit_cost_minor: number | null;
  created_at: string;
}

/** Dashboard key performance indicators (all monetary values in minor units). */
export interface DashboardKpis {
  todaySalesMinor: number;
  todayTransactions: number;
  lowStockCount: number;
  totalProductsCount: number;
  monthSalesMinor: number;
}

// ─── Date Helpers ───────────────────────────────────────────────────────────

/** Returns today's date as an ISO date string (YYYY-MM-DD) in local time. */
function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Returns the first day of the current month as an ISO date string. */
function monthStartIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

// ─── Org Helper ─────────────────────────────────────────────────────────────

/**
 * Returns the current authenticated user's organization ID.
 */
export async function getUserOrgId(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;

    const { data, error } = await sb
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .limit(1)
      .single();

    if (error || !data) return null;
    return (data as { id: string }).id;
  } catch {
    return null;
  }
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

export async function getDashboardKpis(): Promise<DashboardKpis | null> {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const orgId = await getUserOrgId();
    if (!orgId) return null;

    const today = todayIso();
    const monthStart = monthStartIso();
    const lowStockThreshold = 10;

    const [todaySalesRes, monthSalesRes, lowStockRes, totalProductsRes] =
      await Promise.all([
        sb
          .from('cloud_sales')
          .select('grand_total_minor')
          .eq('org_id', orgId)
          .gte('created_at', `${today}T00:00:00`)
          .lte('created_at', `${today}T23:59:59.999`),
        sb
          .from('cloud_sales')
          .select('grand_total_minor')
          .eq('org_id', orgId)
          .gte('created_at', `${monthStart}T00:00:00`),
        sb
          .from('cloud_products')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .eq('is_active', true)
          .lt('stock_quantity', lowStockThreshold),
        sb
          .from('cloud_products')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .eq('is_active', true),
      ]);

    const todaySales = todaySalesRes.data as { grand_total_minor: number }[] | null;
    const todaySalesMinor = todaySales
      ? todaySales.reduce((sum, row) => sum + row.grand_total_minor, 0)
      : 0;
    const todayTransactions = todaySales ? todaySales.length : 0;

    const monthSales = monthSalesRes.data as { grand_total_minor: number }[] | null;
    const monthSalesMinor = monthSales
      ? monthSales.reduce((sum, row) => sum + row.grand_total_minor, 0)
      : 0;

    return {
      todaySalesMinor,
      todayTransactions,
      lowStockCount: lowStockRes.count ?? 0,
      totalProductsCount: totalProductsRes.count ?? 0,
      monthSalesMinor,
    };
  } catch {
    return null;
  }
}

// ─── Products ───────────────────────────────────────────────────────────────

export async function listProducts(): Promise<CloudProduct[]> {
  const sb = getSupabase();
  if (!sb) return [];

  try {
    const { data, error } = await sb
      .from('cloud_products')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error || !data) return [];
    return data as CloudProduct[];
  } catch {
    return [];
  }
}

export async function createProduct(
  product: Omit<CloudProduct, 'id'>,
): Promise<CloudProduct | null> {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const { data, error } = await sb
      .from('cloud_products')
      .insert(product)
      .select()
      .single();

    if (error || !data) return null;
    return data as CloudProduct;
  } catch {
    return null;
  }
}

export async function updateProduct(
  id: string,
  updates: Partial<CloudProduct>,
): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;

  try {
    const { error } = await sb
      .from('cloud_products')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    return !error;
  } catch {
    return false;
  }
}

export async function deleteProduct(id: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;

  try {
    const { error } = await sb
      .from('cloud_products')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    return !error;
  } catch {
    return false;
  }
}

export async function searchProducts(query: string): Promise<CloudProduct[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const { data, error } = await sb
      .from('cloud_products')
      .select('*')
      .eq('is_active', true)
      .or(`name.ilike.%${trimmed}%,barcode.eq.${trimmed}`)
      .order('name', { ascending: true })
      .limit(50);

    if (error || !data) return [];
    return data as CloudProduct[];
  } catch {
    return [];
  }
}

// ─── Sales ──────────────────────────────────────────────────────────────────

export async function listRecentSales(limit = 50): Promise<CloudSale[]> {
  const sb = getSupabase();
  if (!sb) return [];

  try {
    const { data, error } = await sb
      .from('cloud_sales')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data as CloudSale[];
  } catch {
    return [];
  }
}

export async function createSale(
  sale: Omit<CloudSale, 'id' | 'created_at'>,
): Promise<CloudSale | null> {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const { data, error } = await sb
      .from('cloud_sales')
      .insert(sale)
      .select()
      .single();

    if (error || !data) return null;
    return data as CloudSale;
  } catch {
    return null;
  }
}

export async function getTodaySalesTotal(): Promise<{ total_minor: number; count: number }> {
  const sb = getSupabase();
  if (!sb) return { total_minor: 0, count: 0 };

  try {
    const orgId = await getUserOrgId();
    if (!orgId) return { total_minor: 0, count: 0 };

    const today = todayIso();

    const { data, error } = await sb
      .from('cloud_sales')
      .select('grand_total_minor')
      .eq('org_id', orgId)
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59.999`);

    if (error || !data) return { total_minor: 0, count: 0 };

    const rows = data as { grand_total_minor: number }[];
    const total_minor = rows.reduce((sum, row) => sum + row.grand_total_minor, 0);
    return { total_minor, count: rows.length };
  } catch {
    return { total_minor: 0, count: 0 };
  }
}

// ─── Inventory ──────────────────────────────────────────────────────────────

export async function getLowStockProducts(threshold = 10): Promise<CloudProduct[]> {
  const sb = getSupabase();
  if (!sb) return [];

  try {
    const { data, error } = await sb
      .from('cloud_products')
      .select('*')
      .eq('is_active', true)
      .lt('stock_quantity', threshold)
      .order('stock_quantity', { ascending: true });

    if (error || !data) return [];
    return data as CloudProduct[];
  } catch {
    return [];
  }
}

export async function updateStock(
  productId: string,
  newQuantity: number,
): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;

  try {
    const { error } = await sb
      .from('cloud_products')
      .update({
        stock_quantity: newQuantity,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId);

    return !error;
  } catch {
    return false;
  }
}

// ─── Customers ──────────────────────────────────────────────────────────────

export async function listCloudCustomers(): Promise<CloudCustomer[]> {
  const sb = getSupabase();
  if (!sb) return [];

  try {
    const { data, error } = await sb
      .from('cloud_customers')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error || !data) return [];
    return data as CloudCustomer[];
  } catch {
    return [];
  }
}

export async function createCloudCustomer(
  customer: Omit<CloudCustomer, 'id' | 'created_at' | 'updated_at'>,
): Promise<CloudCustomer | null> {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const { data, error } = await sb
      .from('cloud_customers')
      .insert(customer)
      .select()
      .single();

    if (error || !data) return null;
    return data as CloudCustomer;
  } catch {
    return null;
  }
}

// ─── Suppliers ──────────────────────────────────────────────────────────────

export async function listCloudSuppliers(): Promise<CloudSupplier[]> {
  const sb = getSupabase();
  if (!sb) return [];

  try {
    const { data, error } = await sb
      .from('cloud_suppliers')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error || !data) return [];
    return data as CloudSupplier[];
  } catch {
    return [];
  }
}

export async function createCloudSupplier(
  supplier: Omit<CloudSupplier, 'id' | 'created_at' | 'updated_at'>,
): Promise<CloudSupplier | null> {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const { data, error } = await sb
      .from('cloud_suppliers')
      .insert(supplier)
      .select()
      .single();

    if (error || !data) return null;
    return data as CloudSupplier;
  } catch {
    return null;
  }
}
