export function dateToEndOfDay(date: string | undefined): string | undefined {
  return date ? `${date}T23:59:59.999Z` : undefined;
}