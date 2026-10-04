import crypto from 'node:crypto';
import { MARTPOS_PUBLIC_KEY } from './keys';
import { getMachineFingerprint } from './machine';
import type {
  SignedLicense,
  LicensePayload,
  LicenseStatus,
  ActivationResult,
} from '../../shared/types/licensing';
import { getSetting, setSetting } from '../../repositories/settings';
import { logAuditEvent } from '../../repositories/audit';

const LICENSE_SETTING_KEY = 'system.license_data';

/**
 * Deterministically stringify a payload object for signature verification.
 */
function canonicalizePayload(payload: LicensePayload): string {
  return JSON.stringify({
    license_id: payload.license_id,
    customer_name: payload.customer_name,
    business_name: payload.business_name,
    machine_fingerprint: payload.machine_fingerprint,
    issued_at: payload.issued_at,
    expires_at: payload.expires_at,
    max_terminals: payload.max_terminals,
    features: [...payload.features].sort(),
    version_constraint: payload.version_constraint ?? null,
  });
}

/**
 * Authoritatively verify a signed license against this machine.
 */
export function verifyLicenseString(licenseStr: string): LicenseStatus {
  const currentMachine = getMachineFingerprint();

  try {
    const parsed = JSON.parse(licenseStr) as SignedLicense;
    if (!parsed || !parsed.payload || !parsed.signature) {
      return {
        status: 'CORRUPTED',
        is_active: false,
        machine_code: currentMachine,
        message: 'Invalid license format or corrupted structure.',
      };
    }

    const { payload, signature } = parsed;

    // 1. Verify asymmetric signature with public key
    const canonical = canonicalizePayload(payload);
    const isValidSignature = crypto.verify(
      null,
      Buffer.from(canonical),
      MARTPOS_PUBLIC_KEY,
      Buffer.from(signature, 'base64'),
    );

    if (!isValidSignature) {
      return {
        status: 'INVALID_SIGNATURE',
        is_active: false,
        machine_code: currentMachine,
        message: 'Cryptographic signature verification failed. License is not authentic.',
      };
    }

    // 2. Verify machine binding
    if (payload.machine_fingerprint !== currentMachine && payload.machine_fingerprint !== '*') {
      return {
        status: 'MACHINE_MISMATCH',
        is_active: false,
        customer_name: payload.customer_name,
        business_name: payload.business_name,
        license_id: payload.license_id,
        machine_code: currentMachine,
        message: `This license is bound to a different machine (${payload.machine_fingerprint}). This computer's machine code is ${currentMachine}.`,
      };
    }

    // 3. Verify expiry date if not lifetime
    let daysRemaining: number | null = null;
    if (payload.expires_at) {
      const expiryDate = new Date(payload.expires_at).getTime();
      const now = Date.now();
      if (now > expiryDate) {
        return {
          status: 'EXPIRED',
          is_active: false,
          customer_name: payload.customer_name,
          business_name: payload.business_name,
          license_id: payload.license_id,
          expires_at: payload.expires_at,
          days_remaining: 0,
          features: payload.features,
          machine_code: currentMachine,
          message: `License expired on ${payload.expires_at}. Please renew your license with the seller.`,
        };
      }
      daysRemaining = Math.max(0, Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24)));
    }

    // Valid license
    return {
      status: 'VALID',
      is_active: true,
      customer_name: payload.customer_name,
      business_name: payload.business_name,
      license_id: payload.license_id,
      expires_at: payload.expires_at,
      days_remaining: daysRemaining,
      features: payload.features,
      machine_code: currentMachine,
      message: `Licensed to ${payload.customer_name} (${payload.business_name}).`,
    };
  } catch (err) {
    return {
      status: 'CORRUPTED',
      is_active: false,
      machine_code: currentMachine,
      message: err instanceof Error ? err.message : 'Failed to parse license file.',
    };
  }
}

const TRIAL_SETTING_KEY = 'system.trial_started_at';
const TRIAL_DURATION_DAYS = 3;
const TRIAL_DURATION_MS = TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000;

/**
 * Get current system license status from database with 3-day trial evaluation.
 */
export function getSystemLicenseStatus(): LicenseStatus {
  const currentMachine = getMachineFingerprint();
  const rawLicense = getSetting(LICENSE_SETTING_KEY as any);

  // 1. If an actual license string exists in DB, attempt to verify it
  if (rawLicense) {
    const str = typeof rawLicense === 'string' ? rawLicense : JSON.stringify(rawLicense);
    if (str.trim() && str !== '""' && str !== '{}') {
      const verified = verifyLicenseString(str);
      if (verified.is_active && verified.status === 'VALID') {
        console.log('[Licensing] Valid license found and verified:', verified.license_id, verified.customer_name);
        return verified;
      }
    }
  }

  // 2. No valid permanent license — Evaluate 3-Day Trial status
  const now = Date.now();
  let trialStartedAtStr = getSetting(TRIAL_SETTING_KEY as any) as string | undefined;

  if (!trialStartedAtStr || typeof trialStartedAtStr !== 'string' || !trialStartedAtStr.trim()) {
    // First time launch: Initialize trial timestamp in SQLite
    const initialTimestamp = new Date().toISOString();
    setSetting(TRIAL_SETTING_KEY, initialTimestamp);
    trialStartedAtStr = initialTimestamp;
  }

  const trialStartTime = new Date(trialStartedAtStr).getTime();
  const trialEndTime = trialStartTime + TRIAL_DURATION_MS;

  if (now <= trialEndTime) {
    const msRemaining = trialEndTime - now;
    const daysRemaining = Math.max(1, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

    console.log('[Licensing] Trial mode active:', daysRemaining, 'day(s) remaining');
    return {
      status: 'TRIAL',
      is_active: true,
      days_remaining: daysRemaining,
      machine_code: currentMachine,
      message: `Running in 3-Day Trial Mode (${daysRemaining} day(s) remaining). Activate MARTPOS with a valid license JSON for permanent access.`,
    };
  }

  // 3. Trial period has elapsed and no valid license is activated — Lock software
  console.log('[Licensing] Trial expired or unlicensed on machine:', currentMachine);
  return {
    status: 'EXPIRED',
    is_active: false,
    days_remaining: 0,
    machine_code: currentMachine,
    message: `Your ${TRIAL_DURATION_DAYS}-Day Free Trial has expired. Activation with a valid signed license JSON is required to continue. Machine Code: ${currentMachine}`,
  };
}

/**
 * Activate the installation with a provided license string or JSON.
 */
export function activateSystemLicense(licenseInput: string): ActivationResult {
  const cleanInput = licenseInput.trim();
  const verification = verifyLicenseString(cleanInput);

  if (!verification.is_active || verification.status !== 'VALID') {
    logAuditEvent({
      event_type: 'LICENSE_ACTIVATE_FAILED',
      status: 'FAILED',
      details: `License activation failed: ${verification.status} — ${verification.message}`,
    });
    return {
      success: false,
      status: verification,
      error: verification.message,
    };
  }

  // Persist verified license
  setSetting(LICENSE_SETTING_KEY, cleanInput);

  logAuditEvent({
    event_type: 'LICENSE_ACTIVATE_SUCCESS',
    status: 'SUCCESS',
    details: `Successfully activated license ${verification.license_id ?? 'unknown'} for ${verification.customer_name ?? 'customer'}`,
  });

  return {
    success: true,
    status: verification,
  };
}

/**
 * Deactivate / remove license.
 */
export function deactivateSystemLicense(): void {
  setSetting(LICENSE_SETTING_KEY, '');
  logAuditEvent({
    event_type: 'LICENSE_DEACTIVATE',
    status: 'SUCCESS',
    details: 'System license was deactivated.',
  });
}
