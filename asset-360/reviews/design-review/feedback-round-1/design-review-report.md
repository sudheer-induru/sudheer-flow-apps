# Design Review — Asset 360 — round 1

## User and tasks

- **Primary user:** Operations Analyst (or Reliability Engineer) at an industrial facility, working at a desk with a large monitor on a standard desktop or laptop (from `App-Brief.md`).
- **Tasks evaluated:**
  1. Search for an asset by tag (`23-VA-9110-M01`) and open its detail page.
  2. Read the latest-week time series chart and switch between 24 hours, 7 days and 30 days.
  3. Filter the linked work orders (All, Open, Completed) and open one work order.
- **Context:** Walked in the running app in Fusion (development build, `publicdatacdm` project) by the app owner. Desktop browser, mouse and keyboard.

## Task walkthrough findings

- **Task 1 — Search and open asset:** Completed without help and without trouble.
- **Task 2 — Chart window switching:** Completed without help and without trouble.
- **Task 3 — Filter and open work order:** Completed without help and without trouble.

No stuck points, confusion, errors or broken or slow screens were reported in the walkthrough.

## Scores

Scores were proposed from repo probes (`Q1`–`Q10` checks run against `src/`, build output and `index.html`). The walkthrough result above did not change any of them.

| Question | Score | Rationale | Improvement note |
| --- | --- | --- | --- |
| Q1 Aura consistency | 5 | Aura imported in 15 production files; no hex or rgb colours; `aura/no-overriding-styles` lint rule enabled and clean. | None needed. |
| Q2 Navigation & hierarchy | 4 | Breadcrumb and a Back button on the detail page; search is reachable from the detail view. Walkthrough found no problems. | Consider a persistent app header that names the current view, so the detail page does not depend on the breadcrumb alone. |
| Q3 Labels & language | 5 | No vague button labels; search input has an `aria-label` and a concrete example tag in its placeholder; panel titles say what they show. | None needed. |
| Q4 Feedback & validation | 5 | Every data panel has a skeleton while loading, an error state with retry, and a no-access message; Refresh button re-fetches every panel; truncated lists say so. | None needed. |
| Q5 Clickability | 4 | Work-order rows and recently viewed entries are obviously interactive, but the table row and recent-entry cursors are not set to pointer. | Add `cursor-pointer` to clickable rows and recently viewed entries (no clickable `div`s found in the probe). |
| Q6 Error prevention | 5 | Read-only app; the only removal is "Remove from recently viewed", which does not touch data. | None needed. |
| Q7 Responsive | 5 | Built for desktop or laptop as the brief states; no fixed pixel widths; no horizontal scroll containers. | None needed. |
| Q8 Empty states | 5 | Every panel has an empty state with guidance; search starts with "Start with a tag"; no-match and no-linked-series states are explained. | None needed. |
| Q9 Performance | 5 | Search screen ships about 462 kB (141 kB gzip); the detail view (about 777 kB) loads only when an asset is opened; list reads are limited and cached. | None needed. |
| Q10 Accessibility | 4 | 20 `aria-label`s; icon-only buttons labelled; no images without `alt`. The chart itself is not announced to screen readers, although the latest values are listed as text. | Add a text summary of the plotted series (for example, latest value and range) that screen readers can read. |

## Summary

- Average score: 4.7
- Quality level: Excellent

## Must Fix (any score < 3)

None.

## Should Fix (any score 3 – 3.7)

None.

## Nice to Fix (any score 3.8 – 4.4)

1. **Q5 Clickability:** add `cursor-pointer` to clickable work-order rows and recently viewed entries, so the pointer shows they can be opened.
2. **Q10 Accessibility:** give the chart a text summary that screen readers can read (plotted series, latest value and time range).
3. **Q2 Navigation:** consider a persistent header or page title on the detail view, so the current asset is always named at the top of the page.

## Gate status

Average 4.7 meets the 3.8 gate for `flows-external-app-submit`. Nice to Fix items are optional and do not block submission.
