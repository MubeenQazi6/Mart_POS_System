export interface GenerateLicenseInput {
  machineCode: string;
  customerName: string;
  businessName: string;
  expiresMonths: number | null;
  features?: string[];
  maxTerminals?: number;
}

export interface GeneratedLicenseResult {
  payload: {
    license_id: string;
    customer_name: string;
    business_name: string;
    machine_fingerprint: string;
    issued_at: string;
    expires_at: string | null;
    max_terminals: number;
    features: string[];
    version_constraint?: string;
  };
  signature: string;
  json: string;
  isVerified: boolean;
}

export const MARTPOS_PRIVATE_KEY: string;
export const MARTPOS_PUBLIC_KEY: string;

export function canonicalizePayload(payload: GeneratedLicenseResult['payload']): string;

export function generateSignedLicense(input: GenerateLicenseInput): GeneratedLicenseResult;
