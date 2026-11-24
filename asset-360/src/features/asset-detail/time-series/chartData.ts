import type { AggregatePoint } from '@/services/timeSeriesService';

export type ChartRow = { timestamp: number } & Record<string, number>;

export type PlottedSeriesData = {
  /** Chart data key; also the CSS colour variable suffix, so it must be a plain identifier. */
  key: string;
  points: AggregatePoint[];
};

/** Merges per-series aggregates into one row per timestamp, the shape recharts expects. */
export function buildChartRows(series: readonly PlottedSeriesData[]): ChartRow[] {
  const rows = new Map<number, ChartRow>();
  for (const { key, points } of series) {
    for (const point of points) {
      if (point.average === undefined || !Number.isFinite(point.average)) continue;
      const row = rows.get(point.timestamp) ?? { timestamp: point.timestamp };
      row[key] = point.average;
      rows.set(point.timestamp, row);
    }
  }
  return [...rows.values()].sort((a, b) => a.timestamp - b.timestamp);
}

/** Distinct units of the plotted series; missing units count as one "unitless" entry. */
export function distinctUnits(units: readonly (string | undefined)[]): (string | undefined)[] {
  return [...new Set(units)];
}
