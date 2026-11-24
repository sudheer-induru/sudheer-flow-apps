import { describe, expect, it } from 'vitest';

import { formatAxisTime, formatDateTime, formatNumber, formatValue } from './format';

const NOON = Date.UTC(2026, 0, 15, 12, 0);

describe('format', () => {
  it('renders a dash for a missing time', () => {
    expect(formatDateTime(undefined)).toBe('—');
    expect(formatDateTime(NOON)).not.toBe('—');
  });

  it('uses day labels for multi-day spans and clock time within a day', () => {
    expect(formatAxisTime(NOON, 7 * 24 * 3600_000)).not.toBe(formatAxisTime(NOON, 3600_000));
  });

  it('limits significant digits and appends units', () => {
    expect(formatNumber(1.23456789)).toBe(new Intl.NumberFormat(undefined, { maximumSignificantDigits: 6 }).format(1.23457));
    expect(formatValue('OPEN')).toBe('OPEN');
    expect(formatValue(2, 'bar')).toBe(`${formatNumber(2)} bar`);
  });
});
