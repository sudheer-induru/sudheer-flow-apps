import { Skeleton } from '@cognite/aura/components/skeleton';
import { lazy, Suspense } from 'react';

import { useAppRoute } from './useAppRoute';

import { SearchView } from '@/features/search/SearchView';
import { instanceKey } from '@/services/cdm';

const AssetDetailView = lazy(() =>
  import('@/features/asset-detail/AssetDetailView').then((module) => ({ default: module.AssetDetailView }))
);

export function AppRouter() {
  const { state } = useAppRoute();
  if (state.view === 'detail' && state.asset !== undefined) {
    return (
      <Suspense fallback={<Skeleton aria-label="Loading asset" className="m-6 h-40" />}>
        <AssetDetailView asset={state.asset} key={instanceKey(state.asset)} />
      </Suspense>
    );
  }
  return <SearchView />;
}
