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
 *
 * Looks up the `organizations` table where `owner_id` matches the
 * logged-in user. Returns `null` if Supabase is not configured,
 * the user is not authenticated, or no organization is found.
 */
export async function getUserOrgId(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;

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
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

/**
 * Fetches aggregated KPI data for the dashboard.
 *
 * Returns today's sales total (minor units), today's transaction count,
 * low-stock product count (stock < 10), total active products count,
 * and this month's sales total (minor units).
 *
 * Returns `null` if Supabase is unavailable or queries fail.
 */
export async function getDashboardKpis(): Promise<DashboardKpis | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const orgId = await getUserOrgId();
  if (!orgId) return null;

  const today = todayIso();
  const monthStart = monthStartIso();
  const lowStockThreshold = 10;

  // Run all queries in parallel for speed
  const [todaySalesRes, monthSalesRes, lowStockRes, totalProductsRes] =
    await Promise.all([
      // Today's sales
      sb
        .from('cloud_sales')
        .select('grand_total_minor')
        .eq('org_id', orgId)
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59.999`),
      // This month's sales
      sb
        .from('cloud_sales')
        .select('grand_total_minor')
        .eq('org_id', orgId)
        .gte('created_at', `${monthStart}T00:00:00`),
      // Low stock count
      sb
        .from('cloud_products')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('is_active', true)
        .lt('stock_quantity', lowStockThreshold),
      // Total active products
      sb
        .from('cloud_products')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('is_active', true),
    ]);

  // Aggregate today's sales
  const todaySales = todaySalesRes.data as { grand_total_minor: number }[] | null;
  const todaySalesMinor = todaySales
    ? todaySales.reduce((sum, row) => sum + row.grand_total_minor, 0)
    : 0;
  const todayTransactions = todaySales ? todaySales.length : 0;

  // Aggregate month's sales
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
}

// ─── Products ───────────────────────────────────────────────────────────────

/**
 * Lists all active products for the current user's organization.
 *
 * Returns an empty array if Supabase is unavailable or no products exist.
 * Results are ordered by name ascending.
 */
export async function listProducts(): Promise<CloudProduct[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from('cloud_products')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error || !data) return [];
  return data as CloudProduct[];
}

/**
 * Creates a new product in the cloud_products table.
 *
 * The `org_id` should be included in the product input.
 * Returns the created product or `null` on failure.
 */
export async function createProduct(
  product: Omit<CloudProduct, 'id'>,
): Promise<CloudProduct | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from('cloud_products')
    .insert(product)
    .select()
    .single();

  if (error || !data) return null;
  return data as CloudProduct;
}

/**
 * Updates an existing product by its UUID.
 *
 * Only the fields provided in `updates` are changed.
 * Returns `true` if the update succeeded, `false` otherwise.
 */
export async function updateProduct(
  id: string,
  updates: Partial<CloudProduct>,
): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;

  const { error } = await sb
    .from('cloud_products')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  return !error;
}

/**
 * Soft-deletes a product by setting `is_active` to `false`.
 *
 * Financial records referencing this product are preserved.
 * Returns `true` if the operation succeeded, `false` otherwise.
 */
export async function deleteProduct(id: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;

  const { error } = await sb
    .from('cloud_products')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  return !error;
}

/**
 * Searches active products by name or barcode (case-insensitive).
 *
 * Uses Supabase `ilike` for partial matching on the `name` column
 * and an exact-match fallback on the `barcode` column.
 * Returns an empty array if nothing matches or Supabase is unavailable.
 */
export async function searchProducts(query: string): Promise<CloudProduct[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const trimmed = query.trim();
  if (!trimmed) return [];

  // Search by name (partial) OR by exact barcode match
  const { data, error } = await sb
    .from('cloud_products')
    .select('*')
    .eq('is_active', true)
    .or(`name.ilike.%${trimmed}%,barcode.eq.${trimmed}`)
    .order('name', { ascending: true })
    .limit(50);

  if (error || !data) return [];
  return data as CloudProduct[];
}

// ─── Sales ──────────────────────────────────────────────────────────────────

/**
 * Lists recent sales for the current user's organization.
 *
 * @param limit - Maximum number of sales to return (defaults to 50).
 * Results are ordered by `created_at` descending (newest first).
 */
export async function listRecentSales(limit = 50): Promise<CloudSale[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from('cloud_sales')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as CloudSale[];
}

/**
 * Records a new sale in the cloud_sales table.
 *
 * The `id` and `created_at` are generated by the database.
 * Returns the created sale record or `null` on failure.
 */
export async function createSale(
  sale: Omit<CloudSale, 'id' | 'created_at'>,
): Promise<CloudSale | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from('cloud_sales')
    .insert(sale)
    .select()
    .single();

  if (error || !data) return null;
  return data as CloudSale;
}

/**
 * Returns the total sales amount (minor units) and transaction count for today.
 *
 * Uses the current local date for filtering. Returns zeroes if
 * Supabase is unavailable or no sales exist for today.
 */
export async function getTodaySalesTotal(): Promise<{ total_minor: number; count: number }> {
  const sb = getSupabase();
  if (!sb) return { total_minor: 0, count: 0 };

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
}

// ─── Inventory Helpers ──────────────────────────────────────────────────────

/**
 * Returns active products whose stock is below the given threshold.
 *
 * @param threshold - Stock quantity below which a product is considered
 *                    low-stock. Defaults to 10.
 * Results are ordered by stock quantity ascending (lowest first).
 */
export async function getLowStockProducts(threshold = 10): Promise<CloudProduct[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from('cloud_products')
    .select('*')
    .eq('is_active', true)
    .lt('stock_quantity', threshold)
    .order('stock_quantity', { ascending: true });

  if (error || !data) return [];
  return data as CloudProduct[];
}

/**
 * Updates the stock quantity for a specific product.
 *
 * @param productId - UUID of the product to update.
 * @param newQuantity - The new absolute stock quantity (integer).
 * Returns `true` if the update succeeded, `false` otherwise.
 */
export async function updateStock(
  productId: string,
  newQuantity: number,
): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;

  const { error } = await sb
    .from('cloud_products')
    .update({
      stock_quantity: newQuantity,
      updated_at: new Date().toISOString(),
    })
    .eq('id', productId);

  return !error;
}
