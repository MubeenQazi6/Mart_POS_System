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
  // Dynamic decimal places up to the unit's max decimals (e.g. 0 for pieces, 3 for KG)
  return val.toLocaleString('en-PK', { maximumFractionDigits: decimals });
}

export function formatQuantityValueOnly(thousandths: number): string {
  return (thousandths / 1000).toString();
}
