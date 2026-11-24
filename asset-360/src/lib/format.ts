const DATE_TIME = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const AXIS_DAY = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const AXIS_TIME = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });
const NUMBER = new Intl.NumberFormat(undefined, { maximumSignificantDigits: 6 });

export function formatDateTime(timestamp: number | undefined): string {
  return timestamp === undefined ? '—' : DATE_TIME.format(timestamp);
}

/** Short axis label; days for multi-day windows, clock time within a day. */
export function formatAxisTime(timestamp: number, spanMs: number): string {
  return spanMs > 36 * 60 * 60 * 1000 ? AXIS_DAY.format(timestamp) : AXIS_TIME.format(timestamp);
}

export function formatNumber(value: number): string {
  return NUMBER.format(value);
}

export function formatValue(value: number | string, unit?: string): string {
  const text = typeof value === 'number' ? formatNumber(value) : value;
  return unit === undefined ? text : `${text} ${unit}`;
}
