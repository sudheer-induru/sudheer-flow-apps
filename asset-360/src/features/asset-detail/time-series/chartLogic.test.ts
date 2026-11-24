import { describe, expect, it } from 'vitest';

import { buildChartRows, distinctUnits } from './chartData';
import { chartRange, WINDOW_GRANULARITY, WINDOW_MS } from './chartWindow';
import { effectiveSelection, MAX_PLOTTED_SERIES } from './useTimeSeriesPanelViewModel';

import type { AssetTimeSeries } from '@/services/timeSeriesService';

const series = (externalId: string): AssetTimeSeries => ({ space: 's', externalId, kind: 'numeric', isStep: false });

describe(chartRange.name, () => {
  it('ends just past the newest datapoint, not now', () => {
    expect(chartRange([1_000, 5_000, 3_000], '24h')).toEqual({ start: 5_001 - WINDOW_MS['24h'], end: 5_001 });
  });

  it('is undefined without datapoints', () => {
    expect(chartRange([], '7d')).toBeUndefined();
  });

  it('targets about 300 points per window', () => {
    const minutes = { '5m': 5, '30m': 30, '2h': 120 };
    for (const window of ['24h', '7d', '30d'] as const) {
      const points = WINDOW_MS[window] / (minutes[WINDOW_GRANULARITY[window] as keyof typeof minutes] * 60_000);
      expect(points).toBeGreaterThanOrEqual(288);
      expect(points).toBeLessThanOrEqual(360);
    }
  });
});

describe(buildChartRows.name, () => {
  it('merges series by timestamp, sorted, skipping missing averages', () => {
    const rows = buildChartRows([
      { key: 'series1', points: [{ timestamp: 2, average: 20 }, { timestamp: 1, average: 10 }] },
      { key: 'series2', points: [{ timestamp: 2, average: 200 }, { timestamp: 3 }, { timestamp: 4, average: Number.NaN }] },
    ]);

    expect(rows).toEqual([
      { timestamp: 1, series1: 10 },
      { timestamp: 2, series1: 20, series2: 200 },
    ]);
  });
});

describe(distinctUnits.name, () => {
  it('treats a missing unit as its own unit', () => {
    expect(distinctUnits(['bar', 'bar', undefined])).toEqual(['bar', undefined]);
  });
});

describe(effectiveSelection.name, () => {
  const numeric = ['a', 'b', 'c', 'd', 'e', 'f'].map(series);

  it('defaults to the first numeric series', () => {
    expect(effectiveSelection(numeric, undefined).map((item) => item.externalId)).toEqual(['a']);
    expect(effectiveSelection([], undefined)).toEqual([]);
  });

  it('keeps the chosen order, drops unknown ids and caps the count', () => {
    const chosen = ['f', 'zz', 'a', 'b', 'c', 'd', 'e'].map((externalId) => ({ space: 's', externalId }));

    expect(effectiveSelection(numeric, chosen).map((item) => item.externalId)).toEqual(['f', 'a', 'b', 'c', 'd']);
    expect(effectiveSelection(numeric, chosen)).toHaveLength(MAX_PLOTTED_SERIES);
  });

  it('honours an explicit empty choice', () => {
    expect(effectiveSelection(numeric, [])).toEqual([]);
  });
});
