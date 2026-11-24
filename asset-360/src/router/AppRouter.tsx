import { useAppRoute } from './useAppRoute';

import { AssetDetailView } from '@/features/asset-detail/AssetDetailView';
import { SearchView } from '@/features/search/SearchView';
import { instanceKey } from '@/services/cdm';

export function AppRouter() {
  const { state } = useAppRoute();
  if (state.view === 'detail' && state.asset !== undefined) {
    return <AssetDetailView asset={state.asset} key={instanceKey(state.asset)} />;
  }
  return <SearchView />;
}
