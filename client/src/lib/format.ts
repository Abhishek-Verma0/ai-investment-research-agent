/** Formatting helpers for the company snapshot panel. */

export function money(value?: number, currency = 'USD', compact = false): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      notation: compact ? 'compact' : 'standard',
      maximumFractionDigits: compact ? 2 : 2,
    }).format(value);
  } catch {
    return value.toLocaleString();
  }
}

export function compact(value?: number): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(
    value,
  );
}

export function pct(value?: number, fromFraction = false): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  const v = fromFraction ? value * 100 : value;
  return `${v >= 0 ? '' : ''}${v.toFixed(2)}%`;
}

export function num(value?: number, digits = 2): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return value.toFixed(digits);
}
