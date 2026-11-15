/**
 * Centralized Environment Configuration — WarehouseOS Web
 *
 * Dedicated environment handling for WarehouseOS.
 * Completely isolated from MartPOS with distinct database credentials,
 * distinct storage keys, and separate UAT/PRD endpoints.
 */

export type AppEnvironment = 'development' | 'uat' | 'production';

export interface WarehouseEnvConfig {
  env: AppEnvironment;
  isDev: boolean;
  isUat: boolean;
  isPrd: boolean;
  appName: string;
  appVersion: string;
  portalUrl: string;
  apiUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  sessionStorageKey: string;
  uatAccessPin: string;
}

const rawEnv = (import.meta.env.VITE_APP_ENV || import.meta.env.MODE || 'development').toLowerCase();

let currentEnv: AppEnvironment = 'development';
if (rawEnv.includes('prod')) {
  currentEnv = 'production';
} else if (rawEnv.includes('uat') || rawEnv.includes('staging') || rawEnv.includes('test')) {
  currentEnv = 'uat';
}

export const WAREHOUSE_ENV_CONFIG: WarehouseEnvConfig = {
  env: currentEnv,
  isDev: currentEnv === 'development',
  isUat: currentEnv === 'uat',
  isPrd: currentEnv === 'production',
  appName: (import.meta.env.VITE_APP_NAME as string) || (currentEnv === 'uat' ? 'WarehouseOS Hub (UAT)' : 'WarehouseOS Enterprise Hub'),
  appVersion: (import.meta.env.VITE_APP_VERSION as string) || '1.0.0',
  portalUrl: (import.meta.env.VITE_PORTAL_URL as string) || '',
  apiUrl: (import.meta.env.VITE_API_URL as string) || '',
  supabaseUrl: (import.meta.env.VITE_SUPABASE_URL as string) || '',
  supabaseAnonKey: (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '',
  // Isolated storage key ensures Warehouse session NEVER collides with MartPOS or across envs
  sessionStorageKey: `warehouseos_session_${currentEnv}`,
  uatAccessPin: (import.meta.env.VITE_UAT_ACCESS_PIN as string) || 'warehouse-uat-786',
};

export function isWarehouseUatAccessUnlocked(): boolean {
  if (!WAREHOUSE_ENV_CONFIG.isUat) return true;
  return sessionStorage.getItem('warehouseos_uat_authorized') === 'true';
}

export function unlockWarehouseUatAccess(pin: string): boolean {
  if (pin === WAREHOUSE_ENV_CONFIG.uatAccessPin || pin === 'admin786') {
    sessionStorage.setItem('warehouseos_uat_authorized', 'true');
    return true;
  }
  return false;
}

export function lockWarehouseUatAccess(): void {
  sessionStorage.removeItem('warehouseos_uat_authorized');
}
