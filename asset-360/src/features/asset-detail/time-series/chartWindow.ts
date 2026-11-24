import type { TimeWindow } from '@/host/hostState';

const HOUR = 60 * 60 * 1000;

export const WINDOW_LABEL: Record<TimeWindow, string> = {
  '24h': '24 hours',
  '7d': '7 days',
  '30d': '30 days',
};

export const WINDOW_MS: Record<TimeWindow, number> = {
  '24h': 24 * HOUR,
  '7d': 7 * 24 * HOUR,
  '30d': 30 * 24 * HOUR,
};

/** About 300 points per series for each window (SPEC FR-011). */
export const WINDOW_GRANULARITY: Record<TimeWindow, string> = {
  '24h': '5m',
  '7d': '30m',
  '30d': '2h',
};

export type ChartRange = {
  start: number;
  /** Exclusive, one millisecond past the newest datapoint so that point is included. */
  end: number;
};

/**
 * The window ends at the newest datapoint of the plotted series rather than now,
 * so series that stopped reporting still show their last week (SPEC FR-010).
 */
export function chartRange(latestTimestamps: readonly number[], window: TimeWindow): ChartRange | undefined {
  if (latestTimestamps.length === 0) return undefined;
  const end = Math.max(...latestTimestamps) + 1;
  return { start: end - WINDOW_MS[window], end };
}
