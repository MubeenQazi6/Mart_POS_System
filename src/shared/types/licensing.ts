export interface LicensePayload {
  license_id: string;
  customer_name: string;
  business_name: string;
  machine_fingerprint: string;
  issued_at: string;
  expires_at: string | null; // null for lifetime
  max_terminals: number;
  features: string[]; // e.g. ['pos', 'inventory', 'reports', 'multi_user', 'khata']
  version_constraint?: string;
}

export interface SignedLicense {
  payload: LicensePayload;
  signature: string; // Base64 signature
}

export type LicenseStatusType =
  | 'VALID'
  | 'UNLICENSED'
  | 'EXPIRED'
  | 'TRIAL'
  | 'MACHINE_MISMATCH'
  | 'INVALID_SIGNATURE'
  | 'CORRUPTED';

export interface LicenseStatus {
  status: LicenseStatusType;
  is_active: boolean;
  customer_name?: string;
  business_name?: string;
  license_id?: string;
  expires_at?: string | null;
  days_remaining?: number | null;
  features?: string[];
  machine_code: string;
  message: string;
}

export interface ActivationResult {
  success: boolean;
  status: LicenseStatus;
  error?: string;
}
