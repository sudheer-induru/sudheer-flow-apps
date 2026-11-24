# Asset 360 — Flows code review

This document is the platform review for Asset 360, conducted as part of the Cognite Flows app certification process.

## Path to approval

This review found **0 must-fix item(s)** that block approval. The app can move on to `flows-design-review`.

### Reviewed commit

`1c4a266955efcde25fc030e586bfb5b8c8d81155`

## Checks performed

- `flows-review-checks` and `code-quality` pulled from `cognitedata/builder-skills` with `npx @cognite/cli@latest apps skills pull` before scoring; `code-quality` searches run, its fix steps not applied.
- Every hunt in `flows-review-checks` Step 1 (results in `review-findings.md`), file inventory (`review-files.md`), `npm outdated --json` and `npm audit --json` (`review-packages.md`).
- `npm run lint` (0 problems), `npx tsc --noEmit` (0 errors), `npx vitest run --coverage`, `npm run build` (succeeds).
- Each round 1 finding re-checked; status table in `review-findings.md`.

## Test coverage

Framework: Vitest 5.1.1 with v8 coverage, happy-dom 21.0.4. 20 test files, 154 tests, 154 passed, 0 failed, 0 skipped.

**Scope:** `coverage.include` is `src/**/*.{ts,tsx}`; excluded are only `*.test.*`, `src/main.tsx` and `*.d.ts`. No production file is excluded and no test is excluded from the run, so the number below is full scope.

| Statements | Branches | Functions | Lines |
| ---------- | -------- | --------- | ----- |
| 94.21% | 87.79% | 92.14% | **95.82%** |

Lowest files: the three context modules at 50% lines (only their "used outside provider" guard is unreached), `TimeSeriesChart.tsx` 58% (recharts does not lay out in happy-dom), `AppErrorBoundary.tsx` 75%.

## Scores

| Area | Criterion | Score | Notes |
| ---- | --------- | ----- | ----- |
| User & customer | 1.1 Known bugs | 5/5 | Error boundary at the root; every panel has skeleton, empty, error and no-access states and fails independently. Text-only assets now say "Nothing to plot" (`TimeSeriesPanel.tsx:99`) and capped lists say they were cut off. Remaining edge (open work order count at the cap) is a Nice item. |
| User & customer | 1.3 Packages | 4/5 | No critical, high or moderate advisories; 8 low, all transitive through Aura. React 18 and react-table 8 are one major behind, held by `@cognite/app-sdk`/`@cognite/aura` peers. A few in-range updates are available. |
| User & customer | 1.4 Tests & coverage | 5/5 | Honest full-scope 95.82% line coverage; services, reducers, view models, panels and the cut-off and empty states are tested with injected fakes. |
| User & customer | 1.5 Dead code | 5/5 | No unused files, lint and `tsc` clean, no `any`; every production component is under 150 lines after the `SeriesList`/`SearchResults` split. |
| User & customer | 1.6 Patterns & testability | 5/5 | `ServicesContext` injects interface-typed services; the task scheduler is injected into each service; view models per panel; host API, storage and reload injected. The single `vi.mock` is commented and only lowers a constant in one test (`AssetDetailLimits.test.tsx:8-9`). |
| Cognite services | 2.1 DMS query patterns | 5/5 | Free text uses `instances.search` (`assetService.ts:107`). `instances.list` is used only where search cannot apply: prefix on `node.externalId` and `containsAny` on the reverse `assets` relation (`cdm.ts:171`), both documented in SPEC CL-001/CL-002. |
| Cognite services | 2.2 Server-side filter | 5/5 | Prefix, `containsAny` and view filters are in the request; nothing is downloaded and then filtered. |
| Cognite services | 2.3 Limits & pages | 4/5 | Search is limited to 25, pages are 1000, and linked lists stop at 5,000 with the last page shrunk to fit (`cdm.ts:157-173`). The series list renders every loaded row without virtualisation (`SeriesList.tsx:35`). |
| Cognite services | 2.4 Call rate | 5/5 | 300 ms debounce on search, TanStack cache with 5 min stale time, no focus refetch or polling, latest datapoints batched by 100, one aggregates request for all plotted series. |
| Cognite services | 2.5 429 backoff | 4/5 | `QueuedTaskRunner` caps in-flight CDF requests at 6 across all panels (`taskRunner.ts:19`), and `@cognite/sdk` retries 429 with exponential backoff and jitter (bounded at 5). `Retry-After` is not read explicitly. |
| Cognite services | 2.6 CDF Raw | N/A | No Raw usage. |
| Brand | 3.1 Aura | 4/5 | Aura Command, DataGrid, Chart, SegmentedControl, Checkbox, Dialog, Card, Badge, Breadcrumb, EmptyState, Alert and Skeleton throughout; semantic tokens and `chart-*` series colours; inputs and regions labelled. Small custom pieces (KPI tiles, series colour dots) follow Aura tokens. |

## Must Fix

None.

## Should Fix

None.

## Nice to Fix

1. Virtualise or page the series list so an asset with thousands of linked series does not render thousands of rows — `src/features/asset-detail/time-series/SeriesList.tsx:35` — 2.3
2. Show "+" on the open work order figure when the work order list was cut off — `src/features/asset-detail/AssetHeader.tsx:86` — 1.1
3. Read `Retry-After` explicitly if throttling becomes common; today the SDK's exponential backoff with jitter applies — `src/services/taskRunner.ts:4-8` — 2.5
4. Take in-range updates: `@cognite/app-sdk` 0.11.50708, `@cognite/aura` 1.50885.0, `recharts` 3.11.1, `typescript-eslint` 8.74.0 — `package.json` — 1.3
5. Track Aura releases for the transitive low-severity `katex`/`mermaid` advisories — 1.3

## Summary

- Must Fix open: 0
- Should Fix open: 0
- Nice Fix open: 5
