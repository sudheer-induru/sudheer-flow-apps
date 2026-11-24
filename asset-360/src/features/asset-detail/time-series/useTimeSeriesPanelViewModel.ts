import { chartSeriesColor } from '@cognite/aura/chart';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { assetQueryKey, useAssetTimeSeriesQuery, useLatestDatapointsQuery } from '../assetQueries';

import type { ChartRow } from './chartData';
import { buildChartRows, distinctUnits } from './chartData';
import type { ChartRange } from './chartWindow';
import { chartRange, WINDOW_GRANULARITY } from './chartWindow';

import type { InstanceRef, TimeWindow } from '@/host/hostState';
import { DEFAULT_TIME_WINDOW } from '@/host/hostState';
import { useAppRoute } from '@/router/useAppRoute';
import type { ServiceErrorKind } from '@/services/cdfError';
import { errorKindOf } from '@/services/cdfError';
import { instanceKey, MAX_LINKED_INSTANCES, sameInstance } from '@/services/cdm';
import { useServices } from '@/services/ServicesContext';
import type { AssetTimeSeries, LatestDatapoint } from '@/services/timeSeriesService';

export const MAX_PLOTTED_SERIES = 5;

export type SeriesRow = AssetTimeSeries & {
  key: string;
  latest?: LatestDatapoint;
  plottable: boolean;
  selected: boolean;
  /** 1-based colour slot while selected, matching the chart line. */
  colorIndex?: number;
};

export type PlottedLine = {
  dataKey: string;
  label: string;
  color: string;
  unit?: string;
};

export type ChartModel =
  | { status: 'no-numeric' }
  | { status: 'nothing-selected' }
  | { status: 'no-data' }
  | { status: 'loading' }
  | { status: 'error'; errorKind: ServiceErrorKind }
  | {
      status: 'ready';
      rows: ChartRow[];
      lines: PlottedLine[];
      range: ChartRange;
      unitsDiffer: boolean;
    };

export type TimeSeriesPanelViewModel = {
  status: 'loading' | 'error' | 'empty' | 'ready';
  errorKind?: ServiceErrorKind;
  rows: SeriesRow[];
  /** The list reached the read cap, so more linked series may exist. */
  truncated: boolean;
  latestLoading: boolean;
  latestFailed: boolean;
  selectedCount: number;
  window: TimeWindow;
  chart: ChartModel;
  toggleSeries: (series: InstanceRef) => void;
  setWindow: (window: TimeWindow) => void;
  retry: () => void;
};

/**
 * The plotted selection: the user's choice when there is one, otherwise the first
 * numeric series (SPEC FR-009). Choices that are no longer listed are ignored.
 */
export function effectiveSelection(
  numeric: readonly AssetTimeSeries[],
  chosen: readonly InstanceRef[] | undefined
): AssetTimeSeries[] {
  if (chosen === undefined) return numeric.slice(0, 1);
  return chosen
    .map((ref) => numeric.find((series) => sameInstance(series, ref)))
    .filter((series): series is AssetTimeSeries => series !== undefined)
    .slice(0, MAX_PLOTTED_SERIES);
}

export function useTimeSeriesPanelViewModel(asset: InstanceRef): TimeSeriesPanelViewModel {
  const { timeSeriesService } = useServices();
  const { state, setSeries, setWindow } = useAppRoute();
  const window = state.window ?? DEFAULT_TIME_WINDOW;

  const list = useAssetTimeSeriesQuery(asset);
  const latest = useLatestDatapointsQuery(asset, list.data);

  const numeric = useMemo(() => (list.data ?? []).filter((series) => series.kind === 'numeric'), [list.data]);
  const selected = useMemo(() => effectiveSelection(numeric, state.series), [numeric, state.series]);

  const latestByKey = useMemo(
    () => new Map((latest.data ?? []).map((point) => [instanceKey(point.id), point])),
    [latest.data]
  );

  const lines = useMemo<PlottedLine[]>(
    () =>
      selected.map((series, index) => ({
        dataKey: `series${index + 1}`,
        label: series.name ?? series.externalId,
        color: chartSeriesColor(index + 1),
        unit: series.unit,
      })),
    [selected]
  );

  const range = useMemo(() => {
    const timestamps = selected
      .map((series) => latestByKey.get(instanceKey(series))?.timestamp)
      .filter((timestamp): timestamp is number => timestamp !== undefined);
    return chartRange(timestamps, window);
  }, [latestByKey, selected, window]);

  const selectedIds = selected.map(({ space, externalId }) => ({ space, externalId }));
  const aggregates = useQuery({
    queryKey: [
      ...assetQueryKey(asset),
      'aggregates',
      window,
      range?.end,
      selectedIds.map((id) => instanceKey(id)).join('|'),
    ],
    queryFn: () =>
      range === undefined
        ? Promise.resolve([])
        : timeSeriesService.getAggregates({
            ids: selectedIds,
            start: range.start,
            end: range.end,
            granularity: WINDOW_GRANULARITY[window],
          }),
    enabled: range !== undefined && selectedIds.length > 0,
  });

  const chart = useMemo<ChartModel>(() => {
    if (numeric.length === 0) return { status: 'no-numeric' };
    if (selected.length === 0) return { status: 'nothing-selected' };
    if (latest.isPending) return { status: 'loading' };
    if (latest.isError) return { status: 'error', errorKind: errorKindOf(latest.error) ?? 'unknown' };
    if (range === undefined) return { status: 'no-data' };
    if (aggregates.isPending) return { status: 'loading' };
    if (aggregates.isError) return { status: 'error', errorKind: errorKindOf(aggregates.error) ?? 'unknown' };
    const rows = buildChartRows(
      selected.map((series, index) => ({
        key: `series${index + 1}`,
        points: aggregates.data.find((entry) => sameInstance(entry.id, series))?.points ?? [],
      }))
    );
    if (rows.length === 0) return { status: 'no-data' };
    return {
      status: 'ready',
      rows,
      lines,
      range,
      unitsDiffer: distinctUnits(selected.map((series) => series.unit)).length > 1,
    };
  }, [aggregates.data, aggregates.error, aggregates.isError, aggregates.isPending, latest, lines, numeric, range, selected]);

  const rows = useMemo<SeriesRow[]>(
    () =>
      (list.data ?? []).map((series) => {
        const position = selected.findIndex((candidate) => sameInstance(candidate, series));
        return {
          ...series,
          key: instanceKey(series),
          latest: latestByKey.get(instanceKey(series)),
          plottable: series.kind === 'numeric',
          selected: position >= 0,
          colorIndex: position >= 0 ? position + 1 : undefined,
        };
      }),
    [latestByKey, list.data, selected]
  );

  const toggleSeries = useCallback(
    (ref: InstanceRef) => {
      const isSelected = selected.some((series) => sameInstance(series, ref));
      if (isSelected) {
        setSeries(selected.filter((series) => !sameInstance(series, ref)));
        return;
      }
      if (selected.length >= MAX_PLOTTED_SERIES) return;
      setSeries([...selected, ref]);
    },
    [selected, setSeries]
  );

  const { refetch: refetchList } = list;
  const retry = useCallback(() => void refetchList(), [refetchList]);

  const status: TimeSeriesPanelViewModel['status'] = list.isPending
    ? 'loading'
    : list.isError
      ? 'error'
      : list.data.length === 0
        ? 'empty'
        : 'ready';

  return {
    status,
    errorKind: list.isError ? (errorKindOf(list.error) ?? 'unknown') : undefined,
    rows,
    truncated: (list.data?.length ?? 0) >= MAX_LINKED_INSTANCES,
    latestLoading: latest.isPending && (list.data?.length ?? 0) > 0,
    latestFailed: latest.isError,
    selectedCount: selected.length,
    window,
    chart,
    toggleSeries,
    setWindow,
    retry,
  };
}
