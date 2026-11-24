import { useQuery } from '@tanstack/react-query';
import { useCallback, useContext, useMemo } from 'react';

import { rankAssets } from './assetRanking';
import { SearchSessionContext } from './SearchSessionContext';

import { useRecentlyViewed } from '@/features/recently-viewed/RecentlyViewedContext';
import type { RecentlyViewedAsset } from '@/features/recently-viewed/recentlyViewedRepository';
import type { InstanceRef } from '@/host/hostState';
import { useAppRoute } from '@/router/useAppRoute';
import type { Asset } from '@/services/assetService';
import { ASSET_SEARCH_LIMIT } from '@/services/assetService';
import type { ServiceErrorKind } from '@/services/cdfError';
import { errorKindOf } from '@/services/cdfError';
import { useServices } from '@/services/ServicesContext';

export type SearchStatus = 'idle' | 'loading' | 'error' | 'success';

export type SearchViewModel = {
  query: string;
  status: SearchStatus;
  results: Asset[];
  recentlyViewed: RecentlyViewedAsset[];
  errorKind?: ServiceErrorKind;
  setQuery: (query: string) => void;
  retry: () => void;
  selectAsset: (asset: InstanceRef) => void;
  forgetRecent: (asset: InstanceRef) => void;
};

/** Asset search (SPEC FR-001–FR-005): one CDF request per settled query, cached per text. */
export function useSearchViewModel(): SearchViewModel {
  const { assetService } = useServices();
  const { settledQuery } = useContext(SearchSessionContext);
  const { assets: recentlyViewed, remove } = useRecentlyViewed();
  const { state, setQuery, openAsset } = useAppRoute();

  const query = state.query ?? '';
  const typed = query.trim();

  const search = useQuery({
    queryKey: ['search', settledQuery],
    queryFn: async () => rankAssets(await assetService.searchAssets(settledQuery), settledQuery, ASSET_SEARCH_LIMIT),
    enabled: settledQuery !== '',
  });

  const status: SearchStatus = (() => {
    if (typed === '') return 'idle';
    if (typed !== settledQuery || search.isPending) return 'loading';
    if (search.isError) return 'error';
    return 'success';
  })();

  const { refetch } = search;
  const retry = useCallback(() => void refetch(), [refetch]);

  return useMemo(
    () => ({
      query,
      status,
      results: status === 'success' ? (search.data ?? []) : [],
      recentlyViewed,
      errorKind: status === 'error' ? (errorKindOf(search.error) ?? 'unknown') : undefined,
      setQuery,
      retry,
      selectAsset: openAsset,
      forgetRecent: remove,
    }),
    [query, status, search.data, search.error, recentlyViewed, setQuery, retry, openAsset, remove]
  );
}
