# Asset 360 — Flows code review

This document is the platform review for Asset 360, conducted as part of the Cognite Flows app certification process.

## Path to approval

This review found **3 must-fix item(s)** that block approval. Once the must-fix items are addressed, re-run `flows-code-review`.

### Reviewed commit

`09f074f3db5afc72b46ac76381e6a286f378922d`

## Checks performed

- `flows-review-checks` and `code-quality` pulled from `cognitedata/builder-skills` with `npx @cognite/cli@latest apps skills pull` before scoring; `code-quality` searches run, its fix steps not applied.
- Every hunt in `flows-review-checks` Step 1 (results in `review-findings.md`), file inventory (`review-files.md`), `npm outdated --json` and `npm audit --json` (`review-packages.md`).
- `npm run lint` (0 problems), `npx tsc --noEmit` (0 errors), `npx vitest run --coverage`.

## Test coverage

Framework: Vitest 4.1.10 with v8 coverage, happy-dom. 18 test files, 147 tests, 147 passed, 0 failed, 0 skipped.

**Scope:** `coverage.include` is `src/**/*.{ts,tsx}`; excluded are only `*.test.*`, `src/main.tsx` and `*.d.ts`. No production file is excluded and no test is excluded from the run, so the number below is full scope.

| Statements | Branches | Functions | Lines |
| ---------- | -------- | --------- | ----- |
| 92.92% | 85.48% | 90.93% | **94.9%** |

Lowest files: `TimeSeriesChart.tsx` 58% lines (recharts does not lay out in happy-dom), `TimeSeriesPanel.tsx` 72%, `src/lib/utils.ts` 0% (unused).

## Scores

| Area | Criterion | Score | Notes |
| ---- | --------- | ----- | ----- |
| User & customer | 1.1 Known bugs | 4/5 | Error boundary at the root; every panel has skeleton, empty, error and no-access states and fails independently (`AssetDetailView.test.tsx` "keeps other panels working"). One rough edge: misleading empty-state copy when no series is numeric (`TimeSeriesPanel.tsx:101`). |
| User & customer | 1.3 Packages | 2/5 | High-severity `happy-dom` advisory (dev) and `@cognite/app-sdk` two pre-1.0 minors behind. React 18 and react-table 8 are held back by Aura/app-sdk peers, which is acceptable. |
| User & customer | 1.4 Tests & coverage | 5/5 | Honest full-scope 94.9% line coverage; services, reducers, view models and views all tested with injected fakes. |
| User & customer | 1.5 Dead code | 2/5 | `src/lib/utils.ts` is imported nowhere, and two production deps (`clsx`, `tailwind-merge`) exist only for it. Lint and `tsc` are clean, no `any`. |
| User & customer | 1.6 Patterns & testability | 5/5 | `ServicesContext` injects interface-typed services; the task scheduler is injected into each service; view models per panel; host API, storage and reload injected; no `vi.mock`. |
| Cognite services | 2.1 DMS query patterns | 5/5 | Free text uses `instances.search` (`assetService.ts:107`). `instances.list` is used only where search cannot apply: prefix on `node.externalId` and `containsAny` on the reverse `assets` relation (`cdm.ts:163`), both documented in SPEC CL-001/CL-002. |
| Cognite services | 2.2 Server-side filter | 5/5 | Prefix, `containsAny` and view filters are in the request; nothing is downloaded and then filtered. |
| Cognite services | 2.3 Limits & pages | 3/5 | Search is limited to 25 per request and pages are 1000. However, `listAllInstances` follows every cursor without an upper bound, so a heavily linked asset can pull thousands of activities (`cdm.ts:150-171`). |
| Cognite services | 2.4 Call rate | 5/5 | 300 ms debounce on search, TanStack cache with 5 min stale time, no focus refetch or polling, latest datapoints batched by 100, one aggregates request for all plotted series. |
| Cognite services | 2.5 429 backoff | 4/5 | `QueuedTaskRunner` caps in-flight CDF requests at 6 across all panels (`taskRunner.ts`), and `@cognite/sdk` retries 429 with exponential backoff and jitter (bounded at 5). `Retry-After` is not read explicitly. |
| Cognite services | 2.6 CDF Raw | N/A | No Raw usage. |
| Brand | 3.1 Aura | 4/5 | Aura Command, DataGrid, Chart, SegmentedControl, Checkbox, Dialog, Card, Badge, Breadcrumb, EmptyState, Alert and Skeleton throughout; semantic tokens and `chart-*` series colours; inputs and regions labelled. Small custom pieces (KPI tiles, series colour dots) follow Aura tokens. |

## Must Fix

1. **High-severity advisory in `happy-dom` 20.14.6** (GHSA-834v-8h66-3h79). Upgrade to 21.0.4 or later — `package.json` devDependencies — 1.3
   _Impact:_ Running the test suite on a developer machine or CI runner could execute attacker-controlled code if untrusted HTML reaches the test DOM.
2. **`@cognite/app-sdk` 0.9.0 is two pre-1.0 minors behind 0.11.50708.** Upgrade it, together with its required `vite@8.2.4` peer — `package.json:26` — 1.3
   _Impact:_ The app misses host-integration fixes and drifts from the SDK version Fusion expects, which raises the risk of auth or state-sync breakage.
3. **Unused scaffold file `src/lib/utils.ts`**, with `clsx` and `tailwind-merge` kept only for it. Delete the file and both dependencies — `src/lib/utils.ts:1-6` — 1.5
   _Impact:_ Dead code and unused production dependencies enlarge the review and supply-chain surface for no user value.

## Should Fix

1. Bound `listAllInstances` (for example at 5,000 linked items) and tell the user when a list was cut off — `src/services/cdm.ts:150-171` — 2.3
2. Upgrade `vitest`, `@vitest/coverage-v8` and `@vitest/ui` to 4.1.12 or later (moderate advisories) — `package.json` — 1.3
3. When an asset has no numeric series, say that nothing can be plotted instead of asking the user to pick one — `src/features/asset-detail/time-series/TimeSeriesPanel.tsx:101-108` — 1.1

## Nice to Fix

1. Split the series list out of `TimeSeriesPanel.tsx` (196 lines) and the result list out of `SearchView.tsx` (172 lines) — 1.5
2. Read `Retry-After` explicitly if throttling becomes common; today the SDK's exponential backoff with jitter applies — 2.5
3. Take in-range updates: `@cognite/aura` 1.50885.0, `recharts` 3.11.1 — 1.3
4. Track Aura releases for the transitive low-severity `katex`/`mermaid` advisories — 1.3

## Summary

- Must Fix open: 3
- Should Fix open: 3
- Nice Fix open: 4
