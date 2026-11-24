# Asset 360 — Implementation plan

Derived from `SPEC.md` and `AGENTS.md`. Each phase is one or more small,
buildable commits with tests written alongside the code.

## Architecture

```
src/
  services/                 CDF reads behind interfaces (AGENTS.md §3–4)
    cdm.ts                  view refs, containsAny filter, instance readers, paging
    cdfError.ts             CdfServiceError { kind: no-access | transient | unknown }
    assetService.ts         searchAssets (list prefix + search AND), getAsset (byids)
    timeSeriesService.ts    getAssetTimeSeries, getLatestDatapoints, getAggregates
    activityService.ts      getAssetActivities
    ServicesContext.tsx     one injection seam for the three services
  host/
    HostAppContext.ts       narrow HostAppAPI slice + initialState
    hostState.ts            AppState type, guards, parse/serialize (deep link contract)
  router/
    routeState.ts           pure reducer for every host-synced transition
    AppStateProvider.tsx    useReducer seeded from initialState (no flash)
    useAppRoute.ts          dispatch + syncInternalState
    AppRouter.tsx           search | detail
  features/
    search/                 useDebouncedValue, assetRanking, useSearchViewModel, SearchView
    recently-viewed/        localStorage repository + provider
    asset-detail/
      useAssetDetailViewModel.ts, AssetHeader.tsx, AssetDetailView.tsx
      time-series/          chartWindow.ts (anchor, presets, granularity),
                            chartData.ts (aggregates → chart rows),
                            useTimeSeriesPanelViewModel.ts, TimeSeriesPanel.tsx,
                            TimeSeriesChart.tsx
      work-orders/          workOrderStatus.ts, useWorkOrdersPanelViewModel.ts,
                            WorkOrdersPanel.tsx, WorkOrderDialog.tsx
  errors/                   AppErrorBoundary (class), AppErrorFallback
  lib/format.ts             date / number formatting
  __mocks__/                service stubs, test QueryClient, test providers
```

State placement:

| State | Where |
| --- | --- |
| view, query, asset, selected series, window, work-order filter, open work order | host-synced `AppState` (reducer in `AppStateProvider`) |
| CDF server data | TanStack Query, keys prefixed `['asset', space, externalId, …]` so one Refresh refetches the asset |
| debounced query | `useDebouncedValue` (timer injected for tests) |
| recently viewed | `RecentlyViewedProvider` over a `localStorage` repository |
| chart hover | recharts internal |

Query client defaults: `retry: false`, `refetchOnWindowFocus: false`,
`refetchOnReconnect: false`, `staleTime: 5 min` (FR-020, AS-17).

## Phases

1. **Services** — `cdm.ts`, `cdfError.ts`, the three services and their tests
   (request construction, response parsing, paging, error mapping).
2. **Host state and routing** — `hostState.ts` guards and round-trip, route
   reducer, provider, `useAppRoute`, router; tests for every transition and for
   invalid deep links.
3. **Search** — debounced type-ahead with Aura `Command`, ranking, recently
   viewed; view model and view tests (idle, loading skeleton, results, empty,
   error, selection).
4. **Asset header** — byids read, missing asset, hierarchy breadcrumb, tags,
   KPI figures; header refresh triggers all asset queries.
5. **Time series** — linked list with latest values, default selection, up to
   5 series, window presets via Aura segmented control, aggregate query with
   computed granularity, Aura chart with legend and tooltip; pure helpers fully
   unit tested.
6. **Work orders** — status derivation, Aura data grid sorted newest first,
   segmented filter with counts, row dialog; host-synced filter and open row.
7. **App shell** — error boundary, host connection, providers, query client.
8. **Polish** — skeletons, empty states, no-access copy, 1280 px layout check.
9. **Verification** — `npm test`, `npm run lint`, `npm run build`, then
   flows-code-review until no Must Fix items remain, then flows-design-review.

## Risks and how they are handled

- **Raw datapoint limit** (default 100 per series) would truncate a week of data
  → aggregates with `limit: 10000` and a granularity of about 300 buckets.
- **Search default operator change (Nov 2026)** → always send `operator`.
- **Tag not a text property** → prefix filter on `["node","externalId"]`.
- **Deep links naming deleted series** → `ignoreUnknownIds: true`.
- **No live CDF session in the agent environment** → live behaviour is verified
  by running the app in Fusion against `publicdatacdm` with `23-VA-9110-M01`.
