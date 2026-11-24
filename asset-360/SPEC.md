# Feature Specification: Asset 360 Investigation Workspace

<!--
  Living product spec for this app. Source: App-Brief.md (flows-app-brief).
  Data model details verified against the Cognite Core Data Model reference
  (https://docs.cognite.com/cdf/dm/dm_reference/dm_core_data_model) and the
  installed @cognite/sdk typings.
-->

Asset 360 is an investigation workspace inside Cognite Data Fusion (Flows). An
**Operations Analyst** (or Reliability Engineer) types an equipment tag, opens the
asset, and on **one page** sees what the asset is, how its sensors have behaved
recently, and which work orders are planned, running, or done on it. It replaces
the "data detective" routine of switching between SAP for work orders and a
separate historian for sensor data, which takes 1–2 hours per asset today.

Everything is read live from the Cognite Core Data Model (`cdf_cdm`, `v1`). The
app writes nothing to CDF and introduces no views, containers, or spaces.

**Primary persona:** Operations Analyst / Reliability Engineer at an industrial
facility, working at a desk on a desktop or laptop with a large monitor, who
investigates a piece of equipment right after it is flagged by an alarm or a
shift report, then briefs the maintenance team.

**Out of scope for v1:** documents and files (the target project has no
contextualized documents, so there is **no documents panel**), writing to CDF,
mobile layouts, alerts or subscriptions.

## User Scenarios & Testing

### User Stories

1. **(P1) Find the asset.** As an Operations Analyst, I want to type an
   equipment tag (or part of its name or description) and pick the asset from
   ranked, type-ahead suggestions so that I can open the right equipment in
   seconds.
2. **(P1) Confirm identity.** As an Operations Analyst, I want a header with
   the asset's name, tag, description, tags and place in the hierarchy so that I
   know I am investigating the right equipment.
3. **(P1) See recent sensor behaviour.** As an Operations Analyst, I want the
   asset's linked time series listed with their latest values, and a chart that
   shows the most recent week of data ending at the latest datapoint, so that I
   immediately see how the equipment has been behaving even if the data is old.
4. **(P1) See work orders.** As an Operations Analyst, I want the asset's work
   orders (CogniteActivity) in a sortable table with a derived status, and I want
   to open one to read its details, so that I know what work is planned, in
   progress, or recently completed.
5. **(P2) Compare signals.** As an Operations Analyst, I want to pick which
   linked time series are plotted (up to five) and switch the window between
   24 hours, 7 days and 30 days so that I can correlate signals around an event.
6. **(P2) Share the investigation.** As an Operations Analyst, I want the URL to
   capture the asset, the plotted series, the time window and the open work order
   so that a colleague who opens my link lands on the same view.
7. **(P2) Return to recent assets.** As an Operations Analyst, I want my last 10
   opened assets remembered on this device so that I can jump back without
   searching again.
8. **(P2) Trust what I see.** As an Operations Analyst, I want each panel to
   show its own loading, empty, error or no-access state, with a manual refresh,
   so that one failing source never hides the others and data never changes
   behind my back.

### Acceptance Scenarios

- **AS-1 Search by tag.** Given the search page, when the user types
  `23-VA-9110-M01`, then a suggestion for that asset appears at or near the top
  and selecting it opens the asset page.
- **AS-2 Search by partial tag, name or description.** Given the search page,
  when the user types a tag prefix (for example `23-VA`) or words from the
  asset's name or description, then matching assets are suggested, ranked with
  exact tag or name matches first.
- **AS-3 No results.** Given a query that matches nothing, then an empty state
  explains that nothing matched and suggests searching by name instead.
- **AS-4 Header.** Given an opened asset, then the header shows the asset name,
  external ID (tag), space, description, tags, and hierarchy path when present.
- **AS-5 Linked time series.** Given an opened asset, then the time series panel
  lists every CogniteTimeSeries whose `assets` list contains the asset, with name,
  unit and latest value with its timestamp.
- **AS-6 Default chart.** Given an asset with at least one numeric linked time
  series, when the page opens and the user has not chosen series, then the first
  numeric series is plotted over the **7 days ending at its latest datapoint**,
  not ending at today's date.
- **AS-7 Old data is not an empty chart.** Given a series whose latest datapoint
  is months old, then the chart still shows that week of data.
- **AS-8 Series selection.** Given the series list, when the user ticks or
  unticks series, then exactly the ticked series (at most five) are plotted, the
  window ends at the newest latest-datapoint among them, and the selection is in
  the URL. Unticking all series shows a "select a time series" empty state.
- **AS-9 Time window.** Given a plotted chart, when the user picks 24 hours,
  7 days or 30 days, then the chart re-queries that window ending at the same
  latest-datapoint anchor.
- **AS-10 Work order table.** Given an opened asset, then the work orders panel
  lists every CogniteActivity whose `assets` list contains the asset, newest
  first, with name, derived status, scheduled start, actual start and actual end.
- **AS-11 Work order filter.** Given the work order table, when the user picks
  All, Open or Completed, then only matching rows are shown and the counts match.
- **AS-12 Open a work order.** Given the table, when the user activates a row,
  then a dialog shows the work order's name, status, external ID, source ID,
  description, scheduled and actual times, and tags; closing it returns to the
  page. The open work order is in the URL.
- **AS-13 Deep link.** Given a URL produced by the app, when it is opened, then
  the same asset, plotted series, window and open work order are restored.
- **AS-14 Panel isolation.** Given the activity read fails (or returns 401/403),
  then only the work orders panel shows an error (or no-access) state with a
  retry; the header and time series panels are unaffected, and vice versa.
- **AS-15 Missing asset.** Given a deep link to an asset that no longer exists,
  then the page shows an "asset not found" state with a way back to search.
- **AS-16 Recently viewed.** Given the user has opened assets, when the search
  box is empty, then up to 10 recently viewed assets are offered, most recent
  first, without duplicates.
- **AS-17 No background traffic.** Given a loaded page, then no polling,
  streaming or refetch-on-focus happens; data changes only on navigation, user
  selection or the Refresh button.
- **AS-18 Crash containment.** Given a component throws during render, then an
  app-level error screen with a Reload action is shown instead of a blank page.
- **AS-19 Desktop layout.** Given a viewport of 1280 px or wider, then the page
  has no horizontal scrollbar.

## Requirements

### Functional Requirements

**Search**

- **FR-001:** The app MUST offer type-ahead asset search over
  `cdf_cdm.CogniteAsset:v1` matching the node external ID (tag) by prefix and the
  `name` and `description` properties by text search.
- **FR-002:** Search MUST be debounced (about 300 ms) so typing does not send a
  request per keystroke, and a slower response for an older query MUST never
  replace results for the current query.
- **FR-003:** Suggestions MUST be ranked: exact tag, exact name, tag prefix,
  name prefix, then text-search relevance order. At most 25 suggestions are shown.
- **FR-004:** Search MUST be keyboard operable (arrow keys, Enter) using the
  Aura `Command` primitive.

**Asset header**

- **FR-005:** The detail page MUST show `name`, external ID, space, `description`,
  `tags`, `aliases` and the hierarchy from `path` (falling back to `root`/`parent`)
  of the selected CogniteAsset.
- **FR-006:** The header MUST show summary figures: number of linked time series,
  number of open work orders, and the newest latest-datapoint time.

**Time series**

- **FR-007:** The app MUST list the CogniteTimeSeries linked to the asset by
  filtering CogniteTimeSeries on `containsAny` of its `assets` direct relation
  list, following the cursor until all pages are read.
- **FR-008:** For listed series the app MUST read the latest datapoint by
  instance ID and show its value, unit (`sourceUnit`) and timestamp.
- **FR-009:** When the user has not chosen series, the first numeric series MUST
  be plotted by default. The user MAY choose up to 5 series; string and state
  series are listed but not plotted.
- **FR-010:** The chart window MUST end at the newest latest-datapoint timestamp
  among the plotted series and MUST NOT be anchored to the current time. The
  default window is 7 days; 24 hours and 30 days are also offered.
- **FR-011:** The chart MUST request aggregates (`average`, `min`, `max`) at a
  granularity that yields roughly 300 points per series for the chosen window,
  so a week of high-frequency data is not truncated by the raw datapoint limit.
- **FR-012:** The chart MUST use the Aura chart (`@cognite/aura/chart`) with
  Aura chart series colour tokens, a legend, and a tooltip.

**Work orders**

- **FR-013:** The app MUST list the CogniteActivity instances linked to the asset
  by filtering CogniteActivity on `containsAny` of its `assets` direct relation
  list, following the cursor until all pages are read.
- **FR-014:** Work orders MUST be shown in the Aura data grid
  (`@cognite/aura/data-grid`), sorted newest first, with columns Work order,
  Status, Scheduled start, Actual start, Actual end.
- **FR-015:** CogniteActivity has no status property, so status MUST be derived
  from CogniteSchedulable times: `endTime` set → Completed; `startTime` set →
  In progress; `scheduledStartTime` set → Planned; otherwise Not scheduled.
  Open = Planned or In progress.
- **FR-016:** A segmented control MUST filter the table by All / Open /
  Completed with counts.
- **FR-017:** Activating a row MUST open a dialog with the work order details
  (FR-015 status, external ID, `sourceId`, `description`, CogniteSchedulable
  times, `tags`).

**State, navigation and resilience**

- **FR-018:** The route (search or detail), search query, selected asset,
  plotted series, time window, work order filter and open work order MUST be
  host-synced through `syncInternalState` and restored from `initialState`.
  Restored state MUST be validated, and invalid state MUST fall back to search.
- **FR-019:** Recently viewed assets MUST be stored in `localStorage` per CDF
  project, at most 10, most recent first, deduplicated.
- **FR-020:** Each panel MUST have independent loading (skeleton), empty, error
  and no-access (401/403) states. A single Refresh action MUST re-read all panels
  for the current asset; there is no polling or refetch on window focus.
- **FR-021:** An app-level error boundary MUST catch render errors and offer a
  reload.
- **FR-022:** The UI MUST use Aura components and semantic tokens and fit a
  1280 px viewport without horizontal scrolling.
- **FR-023:** The app MUST read live CDF data only; test doubles exist only in
  the automated test suite.

## Success Criteria

- **SC-001:** An analyst goes from typing a tag to seeing header, chart and work
  orders for that asset in under 30 seconds (brief: "hours to minutes").
- **SC-002:** The full brief journey (search an asset, view a live time series
  chart, open a recent work order) is completed on one page without leaving the
  app.
- **SC-003:** For `23-VA-9110-M01` in `publicdatacdm`, the default chart is
  non-empty because it ends at the latest datapoint.
- **SC-004:** A failure in one panel never blanks another panel.
- **SC-005:** A shared link restores the same asset, series, window and open
  work order.
- **SC-006:** Network activity happens only on navigation, selection or Refresh.

## Clarifications

- **CL-001 Search mechanism.** The tag is node identity, not a text property,
  so it is matched with a `prefix` filter on `["node","externalId"]` via
  `/models/instances/list` (also tried upper-cased, and on `name`). Free text uses
  `/models/instances/search` on `name` and `description` with `operator: "AND"`,
  sent explicitly because the service default changes in November 2026.
- **CL-002 Traversal.** `CogniteAsset.timeSeries` and `CogniteAsset.activities`
  are reverse direct relation lists, which `/query` cannot traverse inwards. The
  app reads from the owning views and filters on their `assets` list instead.
- **CL-003 Work order definition.** Every CogniteActivity linked to the asset is
  treated as a work order; no subtype filtering in v1.
- **CL-004 Units.** Plotted series share one y-axis. When their units differ the
  chart says so.
- **CL-005 Latest values.** Latest datapoints are read for at most the first 100
  listed series (one request per 100 IDs).

## Assumptions

- **A-1** The app runs inside Fusion; auth, project and base URL come from the
  host via `@cognite/app-sdk` (`CogniteSdkProvider`, `connectToHostApp`).
- **A-2** The target project (`publicdatacdm`) has CogniteAsset, CogniteTimeSeries
  and CogniteActivity instances with the `assets` relations populated, and the
  user has read access to those views and to datapoints.
- **A-3** Time series data in the project is historical; "latest week" means the
  week before the newest datapoint.
- **A-4** Desktop and laptop only (≥ 1280 px).

---

## Data Models & CDF Integration *(mandatory)*

### Existing views

All read-only, space `cdf_cdm`, version `v1`. Only the properties below are read.

- **`cdf_cdm.CogniteAsset:v1`** — search and header.
  - Node identity: `space`, `externalId` (the equipment tag).
  - CogniteDescribable: `name`, `description`, `tags`, `aliases`.
  - Hierarchy: `parent` (direct relation), `root` (direct relation), `path`
    (list of direct relations).
  - Reverse relations `timeSeries` and `activities` exist but are **not**
    traversed (see CL-002).
- **`cdf_cdm.CogniteTimeSeries:v1`** — time series panel and chart.
  - CogniteDescribable: `name`, `description`.
  - `type` (`numeric` | `string` | `state`), `isStep`, `sourceUnit`.
  - `assets` (list of direct relations to CogniteAsset) — the link to the asset,
    filtered with `containsAny`.
  - Datapoints are read with the time series API using
    `instanceId: { space, externalId }`.
- **`cdf_cdm.CogniteActivity:v1`** — work orders panel and dialog.
  - CogniteDescribable: `name`, `description`, `tags`.
  - CogniteSourceable: `sourceId`.
  - CogniteSchedulable: `startTime`, `endTime`, `scheduledStartTime`,
    `scheduledEndTime`.
  - `assets` (list of direct relations to CogniteAsset) — the link to the asset,
    filtered with `containsAny`.

### Relationships traversed

| From | To | How |
| --- | --- | --- |
| CogniteAsset | CogniteTimeSeries | `POST /models/instances/list` on CogniteTimeSeries with `containsAny` on `["cdf_cdm","CogniteTimeSeries/v1","assets"]` = the asset's `{space, externalId}` |
| CogniteAsset | CogniteActivity | `POST /models/instances/list` on CogniteActivity with `containsAny` on `["cdf_cdm","CogniteActivity/v1","assets"]` = the asset's `{space, externalId}` |
| CogniteTimeSeries | datapoints | `datapoints/latest` and `datapoints/list` (aggregates) by `instanceId` |

### New views

**None.** The app introduces no views, containers or extensions.

### Spaces

- **`cdf_cdm`** — Cognite-managed Core Data Model system space; the three views
  above are read from it. Read-only.
- **Instance spaces** — the asset, time series and activity instances live in
  project data spaces (for example in `publicdatacdm`). The app takes the space
  from each returned instance and never hard-codes it. Read-only.
- **No app-owned space.**
