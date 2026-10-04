/**
 * MARTPOS Internal Barcode Domain Logic
 *
 * Pure functions for EAN-13 barcode generation and validation.
 * No database access, no IPC, no filesystem — fully deterministic and unit-testable.
 *
 * Internal barcode format:
 *   29 + 10-digit sequence + 1 EAN-13 check digit = 13 digits total
 *
 * @see docs/DECISIONS.md ADR-016
 */

/** Maximum value for the 10-digit internal sequence (9,999,999,999). */
const MAX_SEQUENCE = 9_999_999_999;

/** MARTPOS internal barcode prefix. */
const INTERNAL_PREFIX = '29';

/**
 * Calculate the EAN-13 check digit for a 12-digit payload.
 *
 * Algorithm:
 *   1. Starting from the rightmost digit, alternate weights 3 and 1.
 *   2. Sum all weighted digits.
 *   3. Check digit = (10 - (sum % 10)) % 10.
 *
 * Uses only integer arithmetic — no floating point.
 */
export function calculateEAN13CheckDigit(payload12: string): string {
  if (payload12.length !== 12) {
    throw new Error(`EAN-13 payload must be exactly 12 digits, got ${String(payload12.length)}`);
  }
  if (!/^\d{12}$/.test(payload12)) {
    throw new Error('EAN-13 payload must contain only numeric digits');
  }

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = Number(payload12[i]);
    // Positions 0,2,4,6,8,10 have weight 1; positions 1,3,5,7,9,11 have weight 3
    const weight = i % 2 === 0 ? 1 : 3;
    sum += digit * weight;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return String(checkDigit);
}

/**
 * Generate an internal MARTPOS EAN-13 barcode from a sequence number.
 *
 * Format: "29" + zero-padded 10-digit sequence + EAN-13 check digit = 13 chars.
 *
 * @throws Error if sequence is out of valid range [1, 9999999999]
 */
export function generateInternalBarcode(sequenceNumber: number): string {
  if (!Number.isInteger(sequenceNumber) || sequenceNumber < 1 || sequenceNumber > MAX_SEQUENCE) {
    throw new Error(
      `Barcode sequence must be an integer between 1 and ${String(MAX_SEQUENCE)}, got ${String(sequenceNumber)}`
    );
  }

  const sequenceStr = String(sequenceNumber).padStart(10, '0');
  const payload12 = INTERNAL_PREFIX + sequenceStr;
  const checkDigit = calculateEAN13CheckDigit(payload12);

  return payload12 + checkDigit;
}

/**
 * Validate that a barcode string is a valid EAN-13.
 *
 * Checks:
 *   - Exactly 13 characters
 *   - All numeric
 *   - Check digit matches
 */
export function validateEAN13(barcode: string): boolean {
  if (barcode.length !== 13) return false;
  if (!/^\d{13}$/.test(barcode)) return false;

  const payload12 = barcode.slice(0, 12);
  const expectedCheck = calculateEAN13CheckDigit(payload12);

  return barcode[12] === expectedCheck;
}

/**
 * Check whether a barcode is a MARTPOS internal barcode (starts with "29").
 */
export function isInternalBarcode(barcode: string): boolean {
  return barcode.startsWith(INTERNAL_PREFIX) && barcode.length === 13;
}
