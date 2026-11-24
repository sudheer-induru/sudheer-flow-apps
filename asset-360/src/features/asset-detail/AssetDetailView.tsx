import { Button } from '@cognite/aura/components/button';
import { EmptyState, EmptyStateActions, EmptyStateDescription, EmptyStateTitle } from '@cognite/aura/components/empty-state';
import { Skeleton } from '@cognite/aura/components/skeleton';
import { IconArrowLeft, IconRefresh } from '@cognite/aura/icons';

import { AssetHeader } from './AssetHeader';
import { PanelError } from './PanelState';
import { TimeSeriesPanel } from './time-series/TimeSeriesPanel';
import { useAssetDetailViewModel } from './useAssetDetailViewModel';
import { WorkOrdersPanel } from './work-orders/WorkOrdersPanel';

import type { InstanceRef } from '@/host/hostState';

export function AssetDetailView({ asset }: { asset: InstanceRef }) {
  const viewModel = useAssetDetailViewModel(asset);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-6 py-6">
      <nav aria-label="Page actions" className="flex items-center justify-between">
        <Button onClick={viewModel.back} variant="ghost">
          <IconArrowLeft aria-hidden size={16} />
          Back to search
        </Button>
        <Button disabled={viewModel.refreshing} onClick={viewModel.refresh} variant="outline">
          <IconRefresh aria-hidden className={viewModel.refreshing ? 'animate-spin' : undefined} size={16} />
          {viewModel.refreshing ? 'Refreshing' : 'Refresh'}
        </Button>
      </nav>

      {viewModel.status === 'loading' && (
        <div aria-busy="true" aria-label="Loading asset" className="flex flex-col gap-3 rounded-lg border p-6" role="status">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      )}
      {viewModel.status === 'error' && (
        <PanelError kind={viewModel.errorKind ?? 'unknown'} onRetry={viewModel.refresh} subject="this asset" />
      )}
      {viewModel.status === 'not-found' && (
        <EmptyState type="not-found" variant="full">
          <EmptyStateTitle as="h1">Asset not found</EmptyStateTitle>
          <EmptyStateDescription>
            {asset.externalId} in space {asset.space} does not exist or is not a CogniteAsset. It may have been
            deleted since the link was shared.
          </EmptyStateDescription>
          <EmptyStateActions>
            <Button onClick={viewModel.back}>Search assets</Button>
          </EmptyStateActions>
        </EmptyState>
      )}
      {viewModel.asset !== undefined && <AssetHeader asset={viewModel.asset} viewModel={viewModel} />}

      {viewModel.status !== 'not-found' && (
        <div className="flex flex-col gap-4">
          <TimeSeriesPanel asset={asset} />
          <WorkOrdersPanel asset={asset} />
        </div>
      )}
    </div>
  );
}
