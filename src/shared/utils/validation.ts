export const NON_NEGATIVE_NUMBER_ERROR = 'Enter a value of 0 or greater.';
export const POSITIVE_NUMBER_ERROR = 'Enter a value greater than 0.';

export function sanitizeNonNegativeInput(value: string): string {
  if (value === '') return '';
  const trimmed = value.trim();
  if (trimmed === '-') return '';
  if (trimmed.startsWith('-') || trimmed.startsWith('+')) {
    return '';
  }
  return trimmed;
}

export function isValidNonNegativeNumber(value: string | number): boolean {
  if (value === '' || value === null || value === undefined) return false;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0;
}

export function isValidPositiveNumber(value: string | number): boolean {
  if (value === '' || value === null || value === undefined) return false;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0;
}
