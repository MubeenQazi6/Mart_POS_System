const crypto = require('node:crypto');

/**
 * MARTPOS Private Signing Key (Ed25519).
 * Master Offline Developer Key.
 *
 * KEEP THIS PRIVATE AND SECURE.
 * NEVER DISTRIBUTE THIS FILE OR KEY TO CUSTOMERS.
 */
const MARTPOS_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIOYdHe+jf5wqVneFA/ShsYJCZjY36SbpY4Tii6L//TId
-----END PRIVATE KEY-----`;

/**
 * Public Key (for self-verification check)
 */
const MARTPOS_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAPpu3TZLglLNLQAsz7HbVJk+Hadzy+yT6/PmDXb8qhvs=
-----END PUBLIC KEY-----`;

/**
 * Deterministically stringify a payload object for signature generation & verification.
 * Must match Mart_POS_System/src/main/licensing/index.ts canonicalizePayload() exactly.
 */
function canonicalizePayload(payload) {
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
 * Generate a cryptographically signed license object and formatted JSON string.
 *
 * @param {Object} input
 * @param {string} input.machineCode e.g. "ABCD-1234-EFGH-5678" or "*" for all machines
 * @param {string} input.customerName e.g. "Ahmad Ali"
 * @param {string} input.businessName e.g. "Kings Mart Lahore"
 * @param {number|null} input.expiresMonths null for lifetime, or number of months
 * @param {string[]} [input.features] Optional array of features
 * @param {number} [input.maxTerminals] Optional max terminals (default 1)
 * @returns {{ payload: Object, signature: string, json: string, isVerified: boolean }}
 */
function generateSignedLicense(input) {
  const { machineCode, customerName, businessName, expiresMonths, features, maxTerminals } = input;

  if (!machineCode || !machineCode.trim()) {
    throw new Error('Machine code is required (use "*" for any machine)');
  }
  if (!customerName || !customerName.trim()) {
    throw new Error('Customer name is required');
  }
  if (!businessName || !businessName.trim()) {
    throw new Error('Business name is required');
  }

  const issuedAt = new Date().toISOString();
  let expiresAt = null;

  if (expiresMonths !== null && expiresMonths !== undefined && Number(expiresMonths) > 0) {
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + Number(expiresMonths));
    expiresAt = expiry.toISOString();
  }

  const payload = {
    license_id: `MART-${Date.now().toString(36).toUpperCase()}`,
    customer_name: customerName.trim(),
    business_name: businessName.trim(),
    machine_fingerprint: machineCode.trim().toUpperCase(),
    issued_at: issuedAt,
    expires_at: expiresAt,
    max_terminals: maxTerminals && maxTerminals > 0 ? Number(maxTerminals) : 1,
    features: (features && features.length > 0)
      ? features
      : ['pos', 'inventory', 'reports', 'finance', 'multi_user', 'khata', 'backup'],
  };

  const canonical = canonicalizePayload(payload);
  const signature = crypto.sign(null, Buffer.from(canonical), MARTPOS_PRIVATE_KEY).toString('base64');

  const signedLicense = { payload, signature };

  // Immediate built-in verification with public key
  const isVerified = crypto.verify(
    null,
    Buffer.from(canonical),
    MARTPOS_PUBLIC_KEY,
    Buffer.from(signature, 'base64'),
  );

  return {
    ...signedLicense,
    json: JSON.stringify(signedLicense, null, 2),
    isVerified,
  };
}

module.exports = {
  MARTPOS_PRIVATE_KEY,
  MARTPOS_PUBLIC_KEY,
  canonicalizePayload,
  generateSignedLicense,
};
