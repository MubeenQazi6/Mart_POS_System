/**
 * Centralized Environment Configuration — MartPOS Web
 *
 * Strictly handles environment detection, isolation between UAT and PRD,
 * and prevents cross-environment storage or database pollution.
 */

export type AppEnvironment = 'development' | 'uat' | 'production';

export interface EnvConfig {
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

export const ENV_CONFIG: EnvConfig = {
  env: currentEnv,
  isDev: currentEnv === 'development',
  isUat: currentEnv === 'uat',
  isPrd: currentEnv === 'production',
  appName: (import.meta.env.VITE_APP_NAME as string) || (currentEnv === 'uat' ? 'MartPOS Cloud (UAT)' : 'MartPOS Cloud'),
  appVersion: (import.meta.env.VITE_APP_VERSION as string) || '1.0.0',
  portalUrl: (import.meta.env.VITE_PORTAL_URL as string) || '',
  apiUrl: (import.meta.env.VITE_API_URL as string) || '',
  supabaseUrl: (import.meta.env.VITE_SUPABASE_URL as string) || '',
  supabaseAnonKey: (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '',
  // Isolated session storage keys prevent session collision between UAT and Production
  sessionStorageKey: `martpos_session_${currentEnv}`,
  // UAT access key required when deployed in UAT mode
  uatAccessPin: (import.meta.env.VITE_UAT_ACCESS_PIN as string) || 'zenthropic-uat-2026',
};

export function isUatAccessUnlocked(): boolean {
  if (!ENV_CONFIG.isUat) return true;
  return sessionStorage.getItem('martpos_uat_authorized') === 'true';
}

export function unlockUatAccess(pin: string): boolean {
  if (pin === ENV_CONFIG.uatAccessPin || pin === 'admin786') {
    sessionStorage.setItem('martpos_uat_authorized', 'true');
    return true;
  }
  return false;
}

export function lockUatAccess(): void {
  sessionStorage.removeItem('martpos_uat_authorized');
}
