# File inventory: Asset 360

Reviewed commit `09f074f3db5afc72b46ac76381e6a286f378922d`. Every `.ts`/`.tsx` outside `node_modules`, `dist` and `.cognite-bundles`, plus the Vite, Vitest and ESLint configs. Every non-trivial production file was read.

| File | Lines | Structure | Quality | Patterns | Tests | Notes |
| ---- | ----- | --------- | ------- | -------- | ----- | ----- |
| `vite.config.ts` | 28 | ✓ | ✓ | ✓ | n/a | `@` alias, Fusion plugins |
| `vitest.config.ts` | 33 | ✓ | ✓ | ✓ | n/a | coverage `include: src/**`, excludes only tests, `main.tsx`, `*.d.ts` |
| `vitest.setup.ts` | 24 | ✓ | ✓ | ✓ | n/a | ResizeObserver, scrollIntoView, client size stubs for cmdk/DataGrid |
| `eslint.config.mjs` | 96 | ✓ | ✓ | ✓ | n/a | scaffold config |
| `src/main.tsx` | 32 | ✓ | ✓ | ✓ | excluded (bootstrap) | QueryClient: no retry, no focus refetch |
| `src/App.tsx` | 96 | ✓ | ✓ | ✓ | ✓ `App.test.tsx` | host connect, providers |
| `src/errors/AppErrorBoundary.tsx` | 43 | ✓ | ✓ | ✓ DI deps | ✓ | class boundary |
| `src/errors/AppErrorFallback.tsx` | 39 | ✓ | ✓ | ✓ | ✓ (via boundary) | |
| `src/host/HostAppContext.ts` | 22 | ✓ | ✓ | ✓ | ✓ (via providers) | |
| `src/host/hostState.ts` | 119 | ✓ | ✓ | ✓ guards, no casts | ✓ | |
| `src/router/routeState.ts` | 54 | ✓ | ✓ | ✓ pure reducer | ✓ | |
| `src/router/AppStateContext.ts` | 17 | ✓ | ✓ | ✓ | ✓ (via hook) | |
| `src/router/AppStateProvider.tsx` | 19 | ✓ | ✓ | ✓ | ✓ (via hook) | |
| `src/router/useAppRoute.ts` | 57 | ✓ | ✓ | ✓ | ✓ | |
| `src/router/AppRouter.tsx` | 13 | ✓ | ✓ | ✓ | ✓ (via App) | |
| `src/services/cdfError.ts` | 72 | ✓ | ✓ | ✓ | ✓ | |
| `src/services/cdm.ts` | 188 | ✓ | ✓ | ✓ | ✓ | `listAllInstances` follows every cursor (see findings) |
| `src/services/taskRunner.ts` | 62 | ✓ | ✓ | ✓ | ✓ | concurrency cap 6 |
| `src/services/assetService.ts` | 144 | ✓ | ✓ | ✓ interface + class | ✓ | |
| `src/services/timeSeriesService.ts` | 196 | ✓ | ✓ | ✓ interface + class | ✓ | |
| `src/services/activityService.ts` | 72 | ✓ | ✓ | ✓ interface + class | ✓ | |
| `src/services/ServicesContext.ts` | 41 | ✓ | ✓ | ✓ DI context | ✓ (overridden in tests) | |
| `src/features/search/assetRanking.ts` | 25 | ✓ | ✓ | ✓ | ✓ | |
| `src/features/search/SearchSessionContext.ts` | 10 | ✓ | ✓ | ✓ | ✓ (via view) | |
| `src/features/search/SearchSessionProvider.tsx` | 29 | ✓ | ✓ | ✓ timer cleanup | ✓ (via view) | |
| `src/features/search/useSearchViewModel.ts` | 71 | ✓ | ✓ | ✓ ViewModel | ✓ (via view) | |
| `src/features/search/SearchView.tsx` | 172 | ✓ | ✓ | render only | ✓ | > 150 lines, no fetching |
| `src/features/recently-viewed/recentlyViewedRepository.ts` | 105 | ✓ | ✓ | ✓ interface + class | ✓ | |
| `src/features/recently-viewed/RecentlyViewedContext.ts` | 21 | ✓ | ✓ | ✓ | ✓ (via view) | |
| `src/features/recently-viewed/RecentlyViewedProvider.tsx` | 34 | ✓ | ✓ | ✓ | ✓ (via view) | |
| `src/features/asset-detail/assetQueries.ts` | 56 | ✓ | ✓ | ✓ shared query keys | ✓ (via view) | |
| `src/features/asset-detail/useAssetDetailViewModel.ts` | 89 | ✓ | ✓ | ✓ ViewModel | ✓ (via view) | |
| `src/features/asset-detail/AssetDetailView.tsx` | 62 | ✓ | ✓ | render only | ✓ | |
| `src/features/asset-detail/AssetHeader.tsx` | 112 | ✓ | ✓ | render only | ✓ (via view) | |
| `src/features/asset-detail/PanelState.tsx` | 54 | ✓ | ✓ | render only | ✓ (via view) | |
| `src/features/asset-detail/time-series/chartWindow.ts` | 38 | ✓ | ✓ | ✓ | ✓ | |
| `src/features/asset-detail/time-series/chartData.ts` | 28 | ✓ | ✓ | ✓ | ✓ | |
| `src/features/asset-detail/time-series/useTimeSeriesPanelViewModel.ts` | 212 | ✓ | ✓ | ✓ ViewModel | ✓ | |
| `src/features/asset-detail/time-series/TimeSeriesPanel.tsx` | 196 | ✓ | ✓ | render only | ✓ (via view) | > 150 lines, no fetching |
| `src/features/asset-detail/time-series/TimeSeriesChart.tsx` | 77 | ✓ | ✓ | Aura chart | partial (recharts does not lay out in happy-dom) | |
| `src/features/asset-detail/work-orders/workOrderStatus.ts` | 46 | ✓ | ✓ | ✓ | ✓ | |
| `src/features/asset-detail/work-orders/useWorkOrdersPanelViewModel.ts` | 79 | ✓ | ✓ | ✓ ViewModel | ✓ | |
| `src/features/asset-detail/work-orders/WorkOrdersPanel.tsx` | 137 | ✓ | ✓ | Aura DataGrid | ✓ (via view) | |
| `src/features/asset-detail/work-orders/WorkOrderDialog.tsx` | 80 | ✓ | ✓ | Aura Dialog | ✓ (via view) | |
| `src/features/asset-detail/work-orders/WorkOrderStatusBadge.tsx` | 20 | ✓ | ✓ | Aura Badge | ✓ (via view) | |
| `src/lib/format.ts` | 22 | ✓ | ✓ | ✓ | ✓ | |
| `src/lib/utils.ts` | 6 | ✗ | ✗ unused | — | ✗ | scaffold `cn()`; imported nowhere |
| `src/__mocks__/cdf.ts` | 82 | ✓ | ✓ | typed stubs | n/a (test support) | |
| `src/__mocks__/providers.tsx` | 97 | ✓ | ✓ | typed stubs | n/a (test support) | |

Test files (18): `App.test.tsx`, `errors/AppErrorBoundary.test.tsx`, `host/hostState.test.ts`, `router/routeState.test.ts`, `router/useAppRoute.test.tsx`, `services/{cdfError,cdm,assetService,timeSeriesService,activityService,taskRunner}.test.ts`, `features/search/{assetRanking.test.ts,SearchView.test.tsx}`, `features/recently-viewed/recentlyViewedRepository.test.ts`, `features/asset-detail/{AssetDetailView.test.tsx,time-series/chartLogic.test.ts,work-orders/workOrderStatus.test.ts}`, `lib/format.test.ts`.
