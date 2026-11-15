/**
 * Supabase Client — MartPOS Cloud
 *
 * Supabase handles:
 * - Authentication (Email/Password, Google OAuth)
 * - Real-time database (PostgreSQL)
 * - Row Level Security (multi-tenant isolation)
 * - Storage (receipts, images)
 */

import { createClient } from '@supabase/supabase-js';
import { ENV_CONFIG } from '@/config/env';

const supabaseUrl = ENV_CONFIG.supabaseUrl || (import.meta.env.VITE_SUPABASE_URL as string | undefined);
const supabaseAnonKey = ENV_CONFIG.supabaseAnonKey || (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);

// Check if Supabase is configured
export const isSupabaseConfigured =
  !!supabaseUrl &&
  supabaseUrl !== 'https://xxxxxxxxxxxxxxxxxxx.supabase.co' &&
  !!supabaseAnonKey &&
  supabaseAnonKey !== 'your-supabase-anon-key-here';

// Create client only if configured, otherwise use a placeholder
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        storageKey: ENV_CONFIG.sessionStorageKey,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/** Helper to check if Supabase is available */
export function getSupabase() {
  if (!supabase || !isSupabaseConfigured) {
    return null;
  }
  return supabase;
}

/** Database types for MartPOS Cloud */
export interface DbOrganization {
  id: string;
  name: string;
  owner_id: string;
  contact_phone?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

export interface DbSubscription {
  id: string;
  org_id: string;
  user_id: string;
  system_slug: string;
  plan: 'trial' | 'starter' | 'pro' | 'enterprise';
  status: 'active' | 'expired' | 'cancelled';
  trial_ends_at: string;
  current_period_end?: string;
  max_counters: number;
  created_at: string;
  updated_at: string;
}

export interface DbProduct {
  id: string;
  org_id: string;
  name: string;
  barcode: string;
  category?: string;
  cost_price_minor: number;
  selling_price_minor: number;
  stock_quantity: number;
  is_active: boolean;
  updated_at: string;
}

export interface DbSaleInvoice {
  id: string;
  org_id: string;
  counter_id?: string;
  invoice_number: string;
  subtotal_minor: number;
  discount_minor: number;
  total_minor: number;
  payment_method: string;
  customer_name?: string;
  status: 'completed' | 'refunded' | 'cancelled';
  created_at: string;
}
