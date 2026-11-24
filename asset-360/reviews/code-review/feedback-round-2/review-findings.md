# Findings: Asset 360

## Config inspected

- Coverage config file(s): `vitest.config.ts` (`coverage.include: ['src/**/*.{ts,tsx}']`, `coverage.exclude: ['src/**/*.test.{ts,tsx}', 'src/main.tsx', 'src/**/*.d.ts']`)
- Production paths excluded from coverage: none (only tests, `src/main.tsx` and declaration files)
- Tests excluded from the test run: none (`test.exclude` adds only `.claude/**` and `.agents/**`, which hold no app tests)

## Searches

| Check | Hits (file:line or none) |
| ----- | ------------------------ |
| ErrorBoundary | `src/errors/AppErrorBoundary.tsx:28` (class, `getDerivedStateFromError` :31, `componentDidCatch` :35), mounted outermost at `src/App.tsx:88` |
| TODO / FIXME / HACK | none |
| useEffect | `src/App.tsx:57` (host connect, `cancelled` flag cleanup); `src/features/search/SearchSessionProvider.tsx:21` (debounce timer, `clearTimeout` cleanup) |
| useQuery / isPending / isError | 4 hooks in `src/features/asset-detail/assetQueries.ts:21,33,43,52`, aggregates in `useTimeSeriesPanelViewModel.ts:119`, search in `useSearchViewModel.ts:41`. Every consumer renders loading (skeleton), error (`PanelError`) and empty states; the chart adds a "Nothing to plot" state for assets with only text series (`TimeSeriesPanel.tsx:99`) |
| coverage/test exclude | none hiding production code (see above) |
| CDF Raw | none, so 2.6 is N/A |
| instances.list/query/search | `src/services/cdm.ts:171` (list, reverse direct relation via `containsAny`, cursor paging, capped at 5,000 by `MAX_LINKED_INSTANCES` :17 with the last page shrunk to fit :170), `src/services/assetService.ts:67` (retrieve by id), `:90` (list, `prefix` on `node.externalId`, limit 25), `:107` (search on name/description, limit 25) |
| QueuedTaskRunner / 429 | `src/services/taskRunner.ts:19` (`QueuedTaskRunner`, cap 6) injected as the default scheduler into all three services (`assetService.ts:53`, `timeSeriesService.ts:78`, `activityService.ts:39`); 429 classified transient at `src/services/cdfError.ts:39`; 429 backoff with jitter is the `@cognite/sdk` HTTP client's (documented at `taskRunner.ts:4-8`) |
| any / as unknown as | none in `src/` (the only text match is the word "anything" in a comment, `cdfError.ts:8`) |
| vi.mock | `src/features/asset-detail/AssetDetailLimits.test.tsx:9`, commented at :8 (lowers the read cap so the cut-off notices can be tested without 5,000 fixtures; spreads the real module) |
| createContext/useContext in hooks/contexts | none (no `src/hooks/` or `src/contexts/`; contexts live beside their feature) |
| hooks importing `../` | none (no `src/hooks/`) |
| new CogniteClient | only `src/App.test.tsx:30` (test). Production gets the client from `CogniteSdkProvider` |
| Service / Repository classes | `CdmAssetService`, `CdmTimeSeriesService`, `CdmActivityService`, `LocalStorageRecentlyViewedRepository`; each implements an interface |
| pages/views with SDK | none (no `src/pages`/`src/views`; feature views read only view models) |
| ViewModel in hooks | none (no `src/hooks/`); view models live in `src/features/**/use*ViewModel.ts` |
| console.log / debug | none |
| Routes | none (state-driven `AppRouter`, both views reachable; detail view lazy-loaded at `AppRouter.tsx:9`) |
| lint | `npm run lint`: 0 problems |
| tsc | `npx tsc --noEmit`: 0 errors |
| components > 150 lines | none. Largest production components: `WorkOrdersPanel.tsx` 141, `TimeSeriesPanel.tsx` 133, `SearchResults.tsx` 129 |
| unused files | none |

## Round 1 items

| Round 1 item | Status |
| ------------ | ------ |
| Must — `happy-dom` high advisory | Fixed: 21.0.4 |
| Must — `@cognite/app-sdk` two minors behind | Fixed: 0.11.50644 with `vite` 8.2.4 |
| Must — unused `src/lib/utils.ts`, `clsx`, `tailwind-merge` | Fixed: removed |
| Should — unbounded `listAllInstances` | Fixed: capped at 5,000; panels and header say when a list was cut off (`AssetDetailLimits.test.tsx`) |
| Should — `vitest` moderate advisories | Fixed: 5.1.1 |
| Should — misleading empty state for text-only assets | Fixed: "Nothing to plot" (`AssetDetailView.test.tsx`) |
| Nice — split `TimeSeriesPanel.tsx` and `SearchView.tsx` | Fixed: `SeriesList.tsx`, `SearchResults.tsx` |
| Nice — `Retry-After` | Open |
| Nice — in-range package updates | Open (new versions since round 1) |
| Nice — transitive `katex`/`mermaid` low advisories | Open (upstream in Aura) |

## Must / should / nice

- [ ] **Nice** — `SeriesList` renders every linked series as a checkbox row without virtualisation, up to the 5,000 cap; a heavily instrumented asset would render thousands of rows — `src/features/asset-detail/time-series/SeriesList.tsx:35` — 2.3
- [ ] **Nice** — The "Open work orders" figure counts open items among the first 5,000 work orders only and does not show "+" when the list was cut off — `src/features/asset-detail/AssetHeader.tsx:86` — 1.1
- [ ] **Nice** — `Retry-After` is not read explicitly; the SDK's exponential backoff with jitter applies — `src/services/taskRunner.ts:4-8` — 2.5
- [ ] **Nice** — In-range updates available: `@cognite/app-sdk` 0.11.50708, `@cognite/aura` 1.50885.0, `recharts` 3.11.1, `typescript-eslint` 8.74.0 (`vite` stays at 8.2.4, the exact `@cognite/app-sdk` peer) — `package.json` — 1.3
- [ ] **Nice** — Low-severity advisories in `katex`/`mermaid` arrive transitively through `@cognite/aura`; track Aura releases — 1.3
