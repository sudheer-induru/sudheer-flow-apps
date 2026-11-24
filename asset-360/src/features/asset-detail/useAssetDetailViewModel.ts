import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import {
  assetQueryKey,
  useAssetQuery,
  useAssetTimeSeriesQuery,
  useLatestDatapointsQuery,
  useWorkOrdersQuery,
} from './assetQueries';
import { isOpenStatus, deriveWorkOrderStatus } from './work-orders/workOrderStatus';

import type { InstanceRef } from '@/host/hostState';
import { useAppRoute } from '@/router/useAppRoute';
import type { Asset } from '@/services/assetService';
import type { ServiceErrorKind } from '@/services/cdfError';
import { errorKindOf } from '@/services/cdfError';

/** A figure that may still be loading or have failed independently of the header. */
export type Kpi<T> = { status: 'loading' } | { status: 'error' } | { status: 'ready'; value: T };

export type AssetDetailViewModel = {
  status: 'loading' | 'error' | 'not-found' | 'ready';
  errorKind?: ServiceErrorKind;
  asset?: Asset;
  ref: InstanceRef;
  timeSeriesCount: Kpi<number>;
  openWorkOrders: Kpi<number>;
  newestDatapoint: Kpi<number | undefined>;
  refreshing: boolean;
  back: () => void;
  refresh: () => void;
  openAsset: (asset: InstanceRef) => void;
};

function kpiOf<TData, TValue>(
  query: { isPending: boolean; isError: boolean; data: TData | undefined },
  select: (data: TData) => TValue
): Kpi<TValue> {
  if (query.isError) return { status: 'error' };
  if (query.isPending || query.data === undefined) return { status: 'loading' };
  return { status: 'ready', value: select(query.data) };
}

/** Asset header and page actions (SPEC FR-005, FR-006, FR-020). */
export function useAssetDetailViewModel(ref: InstanceRef): AssetDetailViewModel {
  const queryClient = useQueryClient();
  const { openSearch, openAsset } = useAppRoute();
  const assetQuery = useAssetQuery(ref);
  const timeSeries = useAssetTimeSeriesQuery(ref);
  const latest = useLatestDatapointsQuery(ref, timeSeries.data);
  const workOrders = useWorkOrdersQuery(ref);
  const refreshing = useIsFetching({ queryKey: assetQueryKey(ref) }) > 0;

  const refresh = useCallback(
    () => void queryClient.invalidateQueries({ queryKey: assetQueryKey(ref) }),
    [queryClient, ref]
  );

  const newestDatapoint = useMemo<Kpi<number | undefined>>(() => {
    if (timeSeries.data?.length === 0) return { status: 'ready', value: undefined };
    return kpiOf(latest, (points) => (points.length === 0 ? undefined : Math.max(...points.map((p) => p.timestamp))));
  }, [latest, timeSeries.data]);

  const status: AssetDetailViewModel['status'] = assetQuery.isPending
    ? 'loading'
    : assetQuery.isError
      ? 'error'
      : assetQuery.data === null
        ? 'not-found'
        : 'ready';

  return {
    status,
    errorKind: assetQuery.isError ? (errorKindOf(assetQuery.error) ?? 'unknown') : undefined,
    asset: assetQuery.data ?? undefined,
    ref,
    timeSeriesCount: kpiOf(timeSeries, (series) => series.length),
    openWorkOrders: kpiOf(
      workOrders,
      (items) => items.filter((item) => isOpenStatus(deriveWorkOrderStatus(item))).length
    ),
    newestDatapoint,
    refreshing,
    back: openSearch,
    refresh,
    openAsset,
  };
}
