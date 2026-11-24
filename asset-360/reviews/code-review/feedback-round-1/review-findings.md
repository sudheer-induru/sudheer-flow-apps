# Findings: Asset 360

## Config inspected

- Coverage config file(s): `vitest.config.ts` (`coverage.include: ['src/**/*.{ts,tsx}']`, `coverage.exclude: ['src/**/*.test.{ts,tsx}', 'src/main.tsx', 'src/**/*.d.ts']`)
- Production paths excluded from coverage: none (only tests, `src/main.tsx` and declaration files)
- Tests excluded from the test run: none (`test.exclude` adds only `.claude/**` and `.agents/**`, which hold no app tests)

## Searches

| Check | Hits (file:line or none) |
| ----- | ------------------------ |
| ErrorBoundary | `src/errors/AppErrorBoundary.tsx:28` (class, `getDerivedStateFromError`, `componentDidCatch`), mounted outermost at `src/App.tsx:88` |
| TODO / FIXME / HACK | none |
| useEffect | `src/App.tsx:53` (host connect, `cancelled` flag cleanup); `src/features/search/SearchSessionProvider.tsx:21` (debounce timer, `clearTimeout` cleanup) |
| useQuery / isPending / isError | 4 hooks in `src/features/asset-detail/assetQueries.ts`, aggregates in `useTimeSeriesPanelViewModel.ts:113`, search in `useSearchViewModel.ts:41`. Every consumer renders loading (skeleton), error (`PanelError`) and empty states |
| coverage/test exclude | none hiding production code (see above) |
| CDF Raw | none, so 2.6 is N/A |
| instances.list/query/search | `src/services/cdm.ts:163` (list, reverse direct relation via `containsAny`, cursor paging), `src/services/assetService.ts:67` (retrieve by id), `:90` (list, `prefix` on `node.externalId`, limit 25), `:107` (search on name/description, limit 25) |
| QueuedTaskRunner / 429 | `src/services/taskRunner.ts:19` (`QueuedTaskRunner`, cap 6, injected into all three services); 429 classified transient at `src/services/cdfError.ts:39`; 429 backoff with jitter is the `@cognite/sdk` HTTP client's (documented at `taskRunner.ts:6-9`) |
| any / as unknown as | none in `src/` (the only text match is the word "anything" in a comment, `cdfError.ts:8`) |
| vi.mock | none |
| createContext/useContext in hooks/contexts | none (no `src/hooks/` or `src/contexts/`; contexts live beside their feature) |
| hooks importing `../` | none (no `src/hooks/`) |
| new CogniteClient | only `src/App.test.tsx:30` (test). Production gets the client from `CogniteSdkProvider` |
| Service / Repository classes | `CdmAssetService`, `CdmTimeSeriesService`, `CdmActivityService`, `LocalStorageRecentlyViewedRepository`; each implements an interface |
| pages/views with SDK | none (no `src/pages`/`src/views`; feature views read only view models) |
| ViewModel in hooks | n/a, view models live in `src/features/**/use*ViewModel.ts` |
| console.log / debug | none |
| Routes | none (state-driven `AppRouter`, both views reachable) |
| lint | `npm run lint`: 0 problems |
| tsc | `npx tsc --noEmit`: 0 errors |
| components > 150 lines | `TimeSeriesPanel.tsx` 196, `SearchView.tsx` 172. Both are render-only over a view model; no fetching |
| unused files | `UNUSED: src/lib/utils.ts` |

## Must / should / nice

- [ ] **Must** — `happy-dom@20.14.6` has a high-severity advisory (GHSA-834v-8h66-3h79, fixed in 21.0.4) — `package.json` devDependencies — 1.3
- [ ] **Must** — `@cognite/app-sdk@0.9.0` is two pre-1.0 minors (breaking under semver) behind 0.11.50708 with no plan — `package.json:26` — 1.3
- [ ] **Must** — `src/lib/utils.ts` is unused scaffold code, and `clsx` and `tailwind-merge` exist only for it — `src/lib/utils.ts:1-6`, `package.json:33,37` — 1.5
- [ ] **Should** — Linked time series and work orders follow every cursor with no upper bound; a heavily linked asset downloads thousands of nodes — `src/services/cdm.ts:150-171` — 2.3
- [ ] **Should** — `vitest@4.1.10` / `@vitest/mocker` moderate advisories (GHSA-82fw-gwwq-j7x9, GHSA-qxg6-89mg-rqv8; fixed in 4.1.12) — `package.json` devDependencies — 1.3
- [ ] **Should** — An asset whose linked series are all string/state series shows "Pick a series to plot … Select one or more numeric series below", but none can be selected — `src/features/asset-detail/time-series/TimeSeriesPanel.tsx:101-108` — 1.1
- [ ] **Nice** — `TimeSeriesPanel.tsx` (196) and `SearchView.tsx` (172) exceed 150 lines; split the series list and result list into their own files — 1.5
- [ ] **Nice** — `Retry-After` is not read explicitly; the SDK's exponential backoff with jitter applies — `src/services/taskRunner.ts:6-9` — 2.5
- [ ] **Nice** — `@cognite/aura` 1.50667.0 → 1.50885.0 and `recharts` 3.11.0 → 3.11.1 available within range — `package.json` — 1.3
- [ ] **Nice** — The low-severity advisories in `katex`/`mermaid` arrive transitively through `@cognite/aura`; track Aura releases — 1.3
