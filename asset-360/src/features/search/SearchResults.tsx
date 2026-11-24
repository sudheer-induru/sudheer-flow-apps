import { Alert, AlertActions, AlertButton, AlertDescription, AlertTitle } from '@cognite/aura/components/alert';
import { Badge } from '@cognite/aura/components/badge';
import { Button } from '@cognite/aura/components/button';
import { CommandGroup, CommandItem } from '@cognite/aura/components/command';
import { EmptyState, EmptyStateDescription, EmptyStateTitle } from '@cognite/aura/components/empty-state';
import { Skeleton } from '@cognite/aura/components/skeleton';
import { IconX } from '@cognite/aura/icons';

import type { SearchViewModel } from './useSearchViewModel';

import type { InstanceRef } from '@/host/hostState';
import type { ServiceErrorKind } from '@/services/cdfError';
import { instanceKey } from '@/services/cdm';

const SEARCH_ERROR_TEXT: Record<ServiceErrorKind, string> = {
  'no-access': 'You do not have access to read assets in this project. Ask an administrator for data model read access.',
  transient: 'The search timed out or was throttled. Try again in a moment.',
  unknown: 'The search could not be completed.',
};

export function SearchResults({ viewModel }: { viewModel: SearchViewModel }) {
  const { status, results, recentlyViewed, errorKind, query, retry, selectAsset, forgetRecent } = viewModel;

  if (status === 'idle') {
    if (recentlyViewed.length === 0) {
      return (
        <EmptyState className="py-10" type="new-object">
          <EmptyStateTitle as="h2">Start with a tag</EmptyStateTitle>
          <EmptyStateDescription>
            Type part of a tag, name or description. Assets you open appear here for quick access.
          </EmptyStateDescription>
        </EmptyState>
      );
    }
    return (
      <CommandGroup heading="Recently viewed">
        {recentlyViewed.map((asset) => (
          <AssetItem asset={asset} key={instanceKey(asset)} onForget={forgetRecent} onSelect={selectAsset} />
        ))}
      </CommandGroup>
    );
  }

  if (status === 'loading') {
    return (
      <div aria-busy="true" aria-label="Searching assets" className="flex flex-col gap-3 p-3" role="status">
        {[0, 1, 2, 3].map((row) => (
          <div className="flex flex-col gap-1.5" key={row}>
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="p-3">
        <Alert alertStyle="card" variant="error">
          <AlertTitle>Search failed</AlertTitle>
          <AlertDescription>{SEARCH_ERROR_TEXT[errorKind ?? 'unknown']}</AlertDescription>
          <AlertActions>
            <AlertButton onClick={retry} type="button">
              Try again
            </AlertButton>
          </AlertActions>
        </Alert>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <EmptyState className="py-10" type="no-results">
        <EmptyStateTitle as="h2">No assets match “{query.trim()}”</EmptyStateTitle>
        <EmptyStateDescription>Check the tag spelling, or try part of the name or description.</EmptyStateDescription>
      </EmptyState>
    );
  }

  return (
    <CommandGroup heading={results.length === 1 ? '1 asset' : `${results.length} assets`}>
      {results.map((asset) => (
        <AssetItem asset={asset} key={instanceKey(asset)} onSelect={selectAsset} />
      ))}
    </CommandGroup>
  );
}

type AssetItemProps = {
  asset: InstanceRef & { name?: string; description?: string };
  onSelect: (asset: InstanceRef) => void;
  onForget?: (asset: InstanceRef) => void;
};

function AssetItem({ asset, onSelect, onForget }: AssetItemProps) {
  return (
    <CommandItem className="group items-start gap-3 py-2" onSelect={() => onSelect(asset)} value={instanceKey(asset)}>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium">{asset.name ?? asset.externalId}</span>
          <Badge background className="shrink-0" variant="decorative-1">
            {asset.externalId}
          </Badge>
        </span>
        {asset.description !== undefined && (
          <span className="truncate text-sm text-muted-foreground">{asset.description}</span>
        )}
        <span className="text-xs text-muted-foreground">Space {asset.space}</span>
      </div>
      {onForget !== undefined && (
        <Button
          aria-label={`Remove ${asset.name ?? asset.externalId} from recently viewed`}
          className="opacity-0 group-hover:opacity-100 group-data-[selected=true]:opacity-100 focus-visible:opacity-100"
          onClick={(event) => {
            event.stopPropagation();
            onForget(asset);
          }}
          onPointerDown={(event) => event.stopPropagation()}
          size="icon"
          variant="ghost"
        >
          <IconX aria-hidden size={16} />
        </Button>
      )}
    </CommandItem>
  );
}
