import { createContext, useContext } from 'react';

import type { RecentlyViewedAsset, RecentlyViewedRepository } from './recentlyViewedRepository';

import type { InstanceRef } from '@/host/hostState';

export type RecentlyViewedContextValue = {
  assets: RecentlyViewedAsset[];
  record: RecentlyViewedRepository['record'];
  remove: (asset: InstanceRef) => void;
};

export const RecentlyViewedContext = createContext<RecentlyViewedContextValue>({
  assets: [],
  record: () => [],
  remove: () => undefined,
});

export function useRecentlyViewed(): RecentlyViewedContextValue {
  return useContext(RecentlyViewedContext);
}
