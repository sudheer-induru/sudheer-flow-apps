import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { vi } from 'vitest';

import { RecentlyViewedProvider } from '@/features/recently-viewed/RecentlyViewedProvider';
import type { RecentlyViewedRepository } from '@/features/recently-viewed/recentlyViewedRepository';
import type { HostAppApi } from '@/host/HostAppContext';
import { HostAppContext } from '@/host/HostAppContext';
import type { AppState } from '@/host/hostState';
import { serializeAppState } from '@/host/hostState';
import { AppStateProvider } from '@/router/AppStateProvider';
import type { ActivityService } from '@/services/activityService';
import type { AssetService } from '@/services/assetService';
import type { Services } from '@/services/ServicesContext';
import { ServicesContext } from '@/services/ServicesContext';
import type { TimeSeriesService } from '@/services/timeSeriesService';

/** Isolated, retry-free cache per test. */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity, staleTime: Infinity } },
  });
}

export function createServiceStubs() {
  return {
    assetService: {
      searchAssets: vi.fn<AssetService['searchAssets']>(() => Promise.resolve([])),
      getAsset: vi.fn<AssetService['getAsset']>(() => Promise.resolve(null)),
    },
    timeSeriesService: {
      getAssetTimeSeries: vi.fn<TimeSeriesService['getAssetTimeSeries']>(() => Promise.resolve([])),
      getLatestDatapoints: vi.fn<TimeSeriesService['getLatestDatapoints']>(() => Promise.resolve([])),
      getAggregates: vi.fn<TimeSeriesService['getAggregates']>(() => Promise.resolve([])),
    },
    activityService: {
      getAssetWorkOrders: vi.fn<ActivityService['getAssetWorkOrders']>(() => Promise.resolve([])),
    },
  } satisfies Services;
}

export type ServiceStubs = ReturnType<typeof createServiceStubs>;

export function createMemoryRepository(): RecentlyViewedRepository {
  let entries: ReturnType<RecentlyViewedRepository['list']> = [];
  return {
    list: () => entries,
    record: (asset) => {
      entries = [
        { space: asset.space, externalId: asset.externalId, name: asset.name, description: asset.description },
        ...entries.filter((entry) => entry.space !== asset.space || entry.externalId !== asset.externalId),
      ].slice(0, 10);
      return entries;
    },
    remove: (ref) => {
      entries = entries.filter((entry) => entry.space !== ref.space || entry.externalId !== ref.externalId);
      return entries;
    },
  };
}

type TestProvidersOptions = {
  services?: Services;
  initialState?: AppState;
  syncInternalState?: HostAppApi['syncInternalState'];
  repository?: RecentlyViewedRepository;
  queryClient?: QueryClient;
};

/** Wraps a tree with every provider the app renders above its routes. */
export function createTestProviders(options: TestProvidersOptions = {}) {
  const services = options.services ?? createServiceStubs();
  const queryClient = options.queryClient ?? createTestQueryClient();
  const repository = options.repository ?? createMemoryRepository();
  const api: HostAppApi = { syncInternalState: options.syncInternalState ?? vi.fn(() => Promise.resolve(true)) };
  const host = {
    api,
    initialState: options.initialState === undefined ? undefined : serializeAppState(options.initialState),
    project: 'test-project',
  };

  function TestProviders({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ServicesContext.Provider value={{ useServices: () => services }}>
          <HostAppContext.Provider value={host}>
            <RecentlyViewedProvider repository={repository}>
              <AppStateProvider>{children}</AppStateProvider>
            </RecentlyViewedProvider>
          </HostAppContext.Provider>
        </ServicesContext.Provider>
      </QueryClientProvider>
    );
  }

  return { TestProviders, services, queryClient, repository, api };
}
