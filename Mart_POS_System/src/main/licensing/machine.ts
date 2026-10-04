import os from 'node:os';
import crypto from 'node:crypto';

/**
 * Generate a deterministic, hashed machine fingerprint based on stable system identifiers.
 * This runs ONLY in the main process and raw values are NEVER exposed to renderer.
 */
export function getMachineFingerprint(): string {
  try {
    const platform = process.platform;
    const arch = process.arch;
    const cpuModel = os.cpus()[0]?.model ?? 'unknown-cpu';
    const cpuCount = os.cpus().length.toString();
    const hostname = os.hostname();
    
    // Combine hardware/OS attributes
    const rawIdentifiers = [
      platform,
      arch,
      cpuModel,
      cpuCount,
      hostname,
      'MARTPOS-HARDWARE-SALT-2026',
    ].join('::');

    // SHA-256 hash into a clean 16-character alphanumeric machine code
    const hash = crypto.createHash('sha256').update(rawIdentifiers).digest('hex');
    const machineCode = hash.substring(0, 16).toUpperCase();
    
    // Format as XXXX-XXXX-XXXX-XXXX
    return `${machineCode.slice(0, 4)}-${machineCode.slice(4, 8)}-${machineCode.slice(8, 12)}-${machineCode.slice(12, 16)}`;
  } catch {
    return 'MART-0000-0000-0000';
  }
}
