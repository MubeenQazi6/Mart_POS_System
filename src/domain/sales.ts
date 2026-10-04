/**
 * MARTPOS Sales Domain Logic
 *
 * Pure functions for invoice number generation and cart total calculation.
 * No database access, no IPC — fully deterministic and unit-testable.
 * All money operations use integer minor units only.
 *
 * @see docs/DECISIONS.md ADR-019, ADR-020
 */

/** Invoice number prefix. */
const INVOICE_PREFIX = 'INV-';

/**
 * Format a Date object into a 14-digit timestamp: YYYYMMDDHHMMSS
 */
export function formatInvoiceTimestamp(date: Date = new Date()): string {
  const year = date.getFullYear().toString().padStart(4, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

/**
 * Generate a formatted invoice number from a sequence number and optional date.
 *
 * Format: "INV-YYYYMMDDHHMMSS-XXXXX" where XXXXX is zero-padded to 5 digits.
 *
 * @throws Error if sequence is not a positive integer
 */
export function generateInvoiceNumber(sequence: number, date: Date = new Date()): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error(
      `Invoice sequence must be a positive integer, got ${String(sequence)}`
    );
  }
  const timestamp = formatInvoiceTimestamp(date);
  const paddedSeq = String(sequence).padStart(5, '0');
  return `${INVOICE_PREFIX}${timestamp}-${paddedSeq}`;
}

/**
 * Validate an invoice number format.
 * Matches:
 * - INV-YYYYMMDDHHMMSS-XXXXX (e.g. INV-20260828151535-00001)
 * - INV-XXXXX (legacy format)
 */
export function isValidInvoiceNumber(invoiceNumber: string): boolean {
  return /^INV-(\d{14}-)?\d{5,}$/.test(invoiceNumber);
}

/**
 * Represents a single cart item with its authoritative (backend-fetched) price.
 */
export interface AuthoritativeCartItem {
  variant_id: number;
  quantity: number; // Scaled by 1000
  unit_price_minor: number; // Authoritative selling_price_minor from DB
  discount_minor: number; // Per-item discount
}

/**
 * Result of cart total calculation — all in minor units.
 */
export interface CartTotals {
  subtotal_minor: number;
  discount_minor: number; // Total discount (item-level + bill-level)
  tax_minor: number; // Currently 0, placeholder for future tax
  total_minor: number;
  item_totals: Array<{
    variant_id: number;
    line_total_minor: number;
  }>;
}

/**
 * Calculate authoritative cart totals using integer arithmetic only.
 *
 * For each item:
 *   line_subtotal = Math.round(quantity / 1000 * unit_price_minor)
 *   line_total = line_subtotal - item_discount_minor
 *
 * Bill total:
 *   subtotal = sum of all line_subtotals (before item discounts)
 *   total_item_discounts = sum of all item_discount_minor
 *   total = subtotal - total_item_discounts - bill_discount_minor - tax_minor
 *
 * @throws Error if any item has invalid quantity or discount
 */
export function calculateCartTotals(
  items: AuthoritativeCartItem[],
  billDiscountMinor: number,
): CartTotals {
  if (billDiscountMinor < 0) {
    throw new Error('Bill discount cannot be negative');
  }

  let subtotal = 0;
  let totalItemDiscounts = 0;
  const rawLineTotals: number[] = [];

  for (const item of items) {
    if (item.quantity <= 0) {
      throw new Error(`Quantity must be a positive integer for variant ${String(item.variant_id)}`);
    }
    if (item.discount_minor < 0) {
      throw new Error(`Item discount cannot be negative for variant ${String(item.variant_id)}`);
    }

    // Integer arithmetic: quantity is scaled by 1000, so we multiply and divide
    // Math.round ensures deterministic rounding for fractional quantities
    const lineSubtotal = Math.round((item.quantity * item.unit_price_minor) / 1000);

    if (item.discount_minor > lineSubtotal) {
      throw new Error(
        `Item discount (${String(item.discount_minor)}) exceeds line subtotal (${String(lineSubtotal)}) for variant ${String(item.variant_id)}`
      );
    }

    const postItemDiscountLineTotal = lineSubtotal - item.discount_minor;
    subtotal += lineSubtotal;
    totalItemDiscounts += item.discount_minor;
    rawLineTotals.push(postItemDiscountLineTotal);
  }

  const subtotalPostItemDiscount = subtotal - totalItemDiscounts;

  if (billDiscountMinor > subtotalPostItemDiscount) {
    throw new Error(
      `Bill discount (${String(billDiscountMinor)}) exceeds remaining total after item discounts`
    );
  }

  const totalDiscount = totalItemDiscounts + billDiscountMinor;
  const taxMinor = 0; // Placeholder for future tax implementation
  const total = subtotal - totalDiscount + taxMinor;

  // Proportionally distribute billDiscountMinor across lines based on each line's share
  // of the post-item-discount subtotal using integer-safe rounding.
  // Reconcile any rounding difference on the last line so sum(distributed discounts) === billDiscountMinor exactly.
  const itemTotals: CartTotals['item_totals'] = [];
  let allocatedBillDiscount = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const postItemDiscount = rawLineTotals[i]!;

    let lineBillDiscount = 0;
    if (billDiscountMinor > 0 && subtotalPostItemDiscount > 0) {
      if (i === items.length - 1) {
        // Last line absorbs any remainder so totals reconcile exactly
        lineBillDiscount = billDiscountMinor - allocatedBillDiscount;
      } else {
        lineBillDiscount = Math.round((postItemDiscount * billDiscountMinor) / subtotalPostItemDiscount);
        allocatedBillDiscount += lineBillDiscount;
      }
    }

    const finalLineTotal = Math.max(0, postItemDiscount - lineBillDiscount);

    itemTotals.push({
      variant_id: item.variant_id,
      line_total_minor: finalLineTotal,
    });
  }

  return {
    subtotal_minor: subtotal,
    discount_minor: totalDiscount,
    tax_minor: taxMinor,
    total_minor: total,
    item_totals: itemTotals,
  };
}
