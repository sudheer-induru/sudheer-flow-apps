import type { ReactNode } from 'react';
import { useCallback, useMemo, useState } from 'react';

import { RecentlyViewedContext } from './RecentlyViewedContext';
import type { RecentlyViewedRepository } from './recentlyViewedRepository';
import { getBrowserStorage, LocalStorageRecentlyViewedRepository } from './recentlyViewedRepository';

import { useHostApp } from '@/host/HostAppContext';
import type { InstanceRef } from '@/host/hostState';

type RecentlyViewedProviderProps = {
  children: ReactNode;
  repository?: RecentlyViewedRepository;
};

export function RecentlyViewedProvider({ children, repository: override }: RecentlyViewedProviderProps) {
  const { project } = useHostApp();
  const fallback = useMemo(() => new LocalStorageRecentlyViewedRepository(getBrowserStorage(), project), [project]);
  const repository = override ?? fallback;
  const [assets, setAssets] = useState(() => repository.list());

  const record = useCallback<RecentlyViewedRepository['record']>(
    (asset) => {
      const next = repository.record(asset);
      setAssets(next);
      return next;
    },
    [repository]
  );
  const remove = useCallback((asset: InstanceRef) => setAssets(repository.remove(asset)), [repository]);
  const value = useMemo(() => ({ assets, record, remove }), [assets, record, remove]);

  return <RecentlyViewedContext.Provider value={value}>{children}</RecentlyViewedContext.Provider>;
}
