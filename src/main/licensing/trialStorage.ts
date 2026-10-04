import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { getSetting, setSetting } from '../../repositories/settings';

const TRIAL_SETTING_KEY = 'system.trial_started_at';
const TRIAL_SECRET_SALT = 'MARTPOS-OFFLINE-TRIAL-INTEGRITY-SALT-2026';
export const TRIAL_DURATION_DAYS = 3;
export const TRIAL_DURATION_MS = TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000;

interface TrialPayload {
  machine_code: string;
  trial_started_at: string;
  signature: string;
}

/**
 * Generate cryptographic HMAC integrity signature for machine + timestamp.
 */
function signTrialRecord(machineCode: string, timestampIso: string): string {
  return crypto
    .createHmac('sha256', TRIAL_SECRET_SALT)
    .update(`${machineCode}::${timestampIso}`)
    .digest('hex');
}

/**
 * Verify whether a trial record is authentic and matches the current machine code.
 */
function verifyTrialRecord(record: TrialPayload, currentMachine: string): boolean {
  if (!record || !record.machine_code || !record.trial_started_at || !record.signature) {
    return false;
  }
  if (record.machine_code !== currentMachine) {
    return false;
  }
  const expectedSig = signTrialRecord(record.machine_code, record.trial_started_at);
  return expectedSig === record.signature;
}

/**
 * Get the list of persistent OS directories used to preserve the trial record across uninstalls.
 */
function getStorageFilePaths(): string[] {
  const paths: string[] = [];

  // 1. Local AppData (survives Roaming AppData removal on standard uninstalls)
  if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
    paths.push(path.join(process.env.LOCALAPPDATA, 'MARTPOS', '.martpos_sys_trial.dat'));
  }

  // 2. ProgramData (system-wide machine storage on Windows)
  if (process.platform === 'win32' && process.env.PROGRAMDATA) {
    paths.push(path.join(process.env.PROGRAMDATA, 'MARTPOS', '.martpos_sys_trial.dat'));
  }

  // 3. User Home Directory hidden reference
  paths.push(path.join(os.homedir(), '.martpos_sys_trial.dat'));

  return paths;
}

/**
 * Read and parse trial record from a given file path.
 */
function readTrialFile(filePath: string): TrialPayload | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf-8').trim();
    if (!content) return null;
    return JSON.parse(content) as TrialPayload;
  } catch {
    return null;
  }
}

/**
 * Atomically write trial record to a given file path, ensuring parent dir exists.
 */
function writeTrialFile(filePath: string, payload: TrialPayload): void {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
  } catch {
    // Non-blocking on restricted folders
  }
}

/**
 * Authoritatively get the persistent trial start timestamp for this machine.
 *
 * Checks SQLite database and multiple OS-level persistent locations.
 * If found, picks the EARLIEST valid timestamp (preventing trial reset via reinstallation).
 * If no record exists anywhere, initializes a brand new 3-day trial and syncs it to all stores.
 */
export function getOrInitMachineTrial(currentMachine: string): { trialStartedAt: string; startTimeMs: number } {
  const candidateTimestamps: number[] = [];

  // 1. Check SQLite database
  try {
    const dbVal = getSetting(TRIAL_SETTING_KEY as any) as string | undefined;
    if (dbVal) {
      const parsedTime = new Date(dbVal).getTime();
      if (!isNaN(parsedTime) && parsedTime > 0) {
        candidateTimestamps.push(parsedTime);
      }
    }
  } catch {
    // Database may not be ready in isolated tests
  }

  // 2. Check persistent OS files
  const filePaths = getStorageFilePaths();
  for (const fp of filePaths) {
    const record = readTrialFile(fp);
    if (record && verifyTrialRecord(record, currentMachine)) {
      const parsedTime = new Date(record.trial_started_at).getTime();
      if (!isNaN(parsedTime) && parsedTime > 0) {
        candidateTimestamps.push(parsedTime);
      }
    }
  }

  // Determine earliest valid trial start time
  let chosenTimeMs: number;
  let chosenIso: string;

  if (candidateTimestamps.length > 0) {
    // Take the earliest recorded trial start date
    chosenTimeMs = Math.min(...candidateTimestamps);
    chosenIso = new Date(chosenTimeMs).toISOString();
  } else {
    // Brand new installation on this machine: initialize trial start time to NOW
    chosenTimeMs = Date.now();
    chosenIso = new Date(chosenTimeMs).toISOString();
  }

  // Create signed record for this machine
  const payload: TrialPayload = {
    machine_code: currentMachine,
    trial_started_at: chosenIso,
    signature: signTrialRecord(currentMachine, chosenIso),
  };

  // Sync to SQLite database
  try {
    const currentDbVal = getSetting(TRIAL_SETTING_KEY as any) as string | undefined;
    if (currentDbVal !== chosenIso) {
      setSetting(TRIAL_SETTING_KEY, chosenIso);
    }
  } catch {
    // Ignore in tests
  }

  // Sync to all OS file locations
  for (const fp of filePaths) {
    writeTrialFile(fp, payload);
  }

  return {
    trialStartedAt: chosenIso,
    startTimeMs: chosenTimeMs,
  };
}
