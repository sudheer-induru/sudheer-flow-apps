import { Badge } from '@cognite/aura/components/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbPageButton,
  BreadcrumbSeparator,
} from '@cognite/aura/components/breadcrumb';
import { Card, CardContent } from '@cognite/aura/components/card';
import { Skeleton } from '@cognite/aura/components/skeleton';
import { Fragment } from 'react';

import type { AssetDetailViewModel, Kpi } from './useAssetDetailViewModel';

import type { InstanceRef } from '@/host/hostState';
import { formatDateTime, formatNumber } from '@/lib/format';
import type { Asset } from '@/services/assetService';
import { instanceKey, MAX_LINKED_INSTANCES, sameInstance } from '@/services/cdm';

type AssetHeaderProps = {
  asset: Asset;
  viewModel: AssetDetailViewModel;
};

/** Ancestors from `path`, falling back to root and parent when no path is stored (SPEC FR-005). */
function ancestorsOf(asset: Asset): InstanceRef[] {
  const path = asset.path.filter((node) => !sameInstance(node, asset));
  if (path.length > 0) return path;
  const fallback = [asset.root, asset.parent].filter((node): node is InstanceRef => node !== undefined);
  return fallback.filter((node, index) => !sameInstance(node, asset) && fallback.findIndex((n) => sameInstance(n, node)) === index);
}

function formatLinkedCount(count: number): string {
  return count >= MAX_LINKED_INSTANCES ? `${formatNumber(MAX_LINKED_INSTANCES)}+` : formatNumber(count);
}

export function AssetHeader({ asset, viewModel }: AssetHeaderProps) {
  const ancestors = ancestorsOf(asset);
  const chips = [...asset.tags.map((tag) => ({ kind: 'Tag', value: tag })), ...asset.aliases.map((alias) => ({ kind: 'Alias', value: alias }))];

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-6">
        {ancestors.length > 0 && (
          <Breadcrumb aria-label="Asset hierarchy">
            <BreadcrumbList>
              {ancestors.map((node) => (
                <Fragment key={instanceKey(node)}>
                  <BreadcrumbItem>
                    <BreadcrumbPageButton onClick={() => viewModel.openAsset(node)}>{node.externalId}</BreadcrumbPageButton>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                </Fragment>
              ))}
              <BreadcrumbItem>
                <BreadcrumbPage>{asset.externalId}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        )}
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-semibold">{asset.name ?? asset.externalId}</h1>
              <Badge background variant="decorative-1">
                {asset.externalId}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">Space {asset.space}</p>
            {asset.description !== undefined && <p className="max-w-prose">{asset.description}</p>}
            {chips.length > 0 && (
              <ul aria-label="Tags and aliases" className="flex flex-wrap gap-1">
                {chips.map((chip) => (
                  <li key={`${chip.kind}:${chip.value}`}>
                    <Badge outline variant="secondary">
                      <span className="text-muted-foreground">{chip.kind}</span> {chip.value}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <dl className="grid grid-cols-3 gap-3">
            <KpiTile label="Linked time series" value={viewModel.timeSeriesCount} format={formatLinkedCount} />
            <KpiTile label="Open work orders" value={viewModel.openWorkOrders} format={formatNumber} />
            <KpiTile
              label="Newest datapoint"
              value={viewModel.newestDatapoint}
              format={(timestamp) => (timestamp === undefined ? 'None' : formatDateTime(timestamp))}
            />
          </dl>
        </div>
      </CardContent>
    </Card>
  );
}

type KpiTileProps<T> = {
  label: string;
  value: Kpi<T>;
  format: (value: T) => string;
};

function KpiTile<T>({ label, value, format }: KpiTileProps<T>) {
  return (
    <div className="flex min-w-36 flex-col gap-1 rounded-lg border bg-muted/40 px-4 py-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">
        {value.status === 'loading' && <Skeleton aria-label={`Loading ${label.toLowerCase()}`} className="h-6 w-16" />}
        {value.status === 'error' && <span className="text-sm font-normal text-muted-foreground">Unavailable</span>}
        {value.status === 'ready' && format(value.value)}
      </dd>
    </div>
  );
}
