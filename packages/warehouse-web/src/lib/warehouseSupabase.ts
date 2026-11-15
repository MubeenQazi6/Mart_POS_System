/**
 * WarehouseOS Dedicated Supabase Client
 *
 * Dedicated database connection for WarehouseOS.
 * Ensures complete multi-tenant and database isolation from MartPOS.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { WAREHOUSE_ENV_CONFIG } from '@/config/env';

const supabaseUrl = WAREHOUSE_ENV_CONFIG.supabaseUrl || (import.meta.env.VITE_SUPABASE_URL as string | undefined);
const supabaseAnonKey = WAREHOUSE_ENV_CONFIG.supabaseAnonKey || (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);

export const isWarehouseSupabaseConfigured =
  !!supabaseUrl &&
  supabaseUrl !== 'https://xxxxxxxxxxxxxxxxxxx.supabase.co' &&
  !!supabaseAnonKey &&
  supabaseAnonKey !== 'your-warehouse-supabase-anon-key-here';

export const warehouseSupabase: SupabaseClient | null = isWarehouseSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        storageKey: WAREHOUSE_ENV_CONFIG.sessionStorageKey,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function getWarehouseSupabase(): SupabaseClient | null {
  if (!warehouseSupabase || !isWarehouseSupabaseConfigured) {
    return null;
  }
  return warehouseSupabase;
}
