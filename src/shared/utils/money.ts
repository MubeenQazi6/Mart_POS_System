/**
 * Money is stored and calculated as integer minor units (e.g. paisa for PKR).
 * 1 PKR = 100 minor units. Never use floating-point for financial math.
 */
export type MoneyMinor = number;

/** Convert a decimal amount to minor units with half-up rounding. */
export function toMinorUnits(amount: number, factor = 100): MoneyMinor {
  return Math.round(amount * factor);
}

/** Convert minor units back to a decimal amount for display only. */
export function fromMinorUnits(minor: MoneyMinor, factor = 100): number {
  return minor / factor;
}

/** Format minor units as a currency string for UI display. */
export function formatMoney(minor: MoneyMinor, currency = 'PKR', factor = 100): string {
  const amount = fromMinorUnits(minor, factor);
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
