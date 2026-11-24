import { useQuery } from '@tanstack/react-query';

import { useRecentlyViewed } from '@/features/recently-viewed/RecentlyViewedContext';
import type { InstanceRef } from '@/host/hostState';
import { useServices } from '@/services/ServicesContext';
import type { AssetTimeSeries } from '@/services/timeSeriesService';
import { LATEST_BATCH_SIZE } from '@/services/timeSeriesService';

/**
 * Every read for one asset shares this prefix, so a single
 * `invalidateQueries({ queryKey: assetQueryKey(asset) })` refreshes all panels (SPEC FR-020).
 */
export function assetQueryKey(asset: InstanceRef) {
  return ['asset', asset.space, asset.externalId] as const;
}

/** Records the asset as recently viewed once it has been read successfully. */
export function useAssetQuery(asset: InstanceRef) {
  const { assetService } = useServices();
  const { record } = useRecentlyViewed();
  return useQuery({
    queryKey: [...assetQueryKey(asset), 'asset'],
    queryFn: async () => {
      const result = await assetService.getAsset(asset);
      if (result !== null) record(result);
      return result;
    },
  });
}

export function useAssetTimeSeriesQuery(asset: InstanceRef) {
  const { timeSeriesService } = useServices();
  return useQuery({
    queryKey: [...assetQueryKey(asset), 'timeSeries'],
    queryFn: () => timeSeriesService.getAssetTimeSeries(asset),
  });
}

/** Latest values for the first 100 listed series (SPEC CL-005). */
export function useLatestDatapointsQuery(asset: InstanceRef, series: AssetTimeSeries[] | undefined) {
  const { timeSeriesService } = useServices();
  const ids = (series ?? []).slice(0, LATEST_BATCH_SIZE).map(({ space, externalId }) => ({ space, externalId }));
  return useQuery({
    queryKey: [...assetQueryKey(asset), 'latest', ids.map((id) => `${id.space}:${id.externalId}`).join('|')],
    queryFn: () => timeSeriesService.getLatestDatapoints(ids),
    enabled: ids.length > 0,
  });
}

export function useWorkOrdersQuery(asset: InstanceRef) {
  const { activityService } = useServices();
  return useQuery({
    queryKey: [...assetQueryKey(asset), 'workOrders'],
    queryFn: () => activityService.getAssetWorkOrders(asset),
  });
}
