/**
 * Money formatting (Minor Units ↔ UI)
 * 1 PKR = 100 Paisa (Minor units)
 * e.g., 25050 minor = 250.50 PKR
 */

export function parseMoneyToMinor(value: string | number): number {
  if (!value) return 0;
  const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
  if (Number.isNaN(num)) return 0;
  return Math.round(num * 100);
}

export function formatMoneyFromMinor(minor: number, currency: string = 'Rs.'): string {
  const val = minor / 100;
  return `${currency} ${val.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatMoneyValueOnly(minor: number): string {
  return (minor / 100).toString();
}

/**
 * Quantity formatting (Thousandths ↔ UI)
 * 1 Unit = 1000 Thousandths
 * e.g., 1500 thousandths = 1.5
 */

export function parseQuantityToThousandths(value: string | number): number {
  if (!value) return 0;
  const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
  if (Number.isNaN(num)) return 0;
  return Math.round(num * 1000);
}

export function formatQuantityFromThousandths(thousandths: number, decimals: number = 3): string {
  const val = thousandths / 1000;
  const safeDecimals = Math.max(0, Math.min(20, Math.round(decimals)));
  return val.toLocaleString('en-PK', { maximumFractionDigits: safeDecimals });
}

export function formatQuantityValueOnly(thousandths: number): string {
  return (thousandths / 1000).toString();
}

/**
 * Robust date-time formatter for receipts and ledgers.
 * Detects SQLite UTC strings ("YYYY-MM-DD HH:MM:SS") and converts them to the local system time.
 */
export function formatReceiptDateTime(dateInput?: string | Date | null): string {
  if (!dateInput) return new Date().toLocaleString();
  if (dateInput instanceof Date) return dateInput.toLocaleString();

  let s = String(dateInput).trim();
  if (!s) return new Date().toLocaleString();

  // If SQLite stored UTC timestamp without 'Z' e.g. "2026-09-16 07:41:37"
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) {
    s = s.replace(' ', 'T') + 'Z';
  } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(s)) {
    s = s + 'Z';
  }

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    return new Date().toLocaleString();
  }
  return d.toLocaleString();
}
