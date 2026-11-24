/**
 * Host-synced application state: the deep-link contract (SPEC FR-018).
 *
 * The Fusion host stores this object in the URL, so it is untrusted when it
 * comes back in and is validated with type guards rather than cast.
 */

export type InstanceRef = {
  space: string;
  externalId: string;
};

export const TIME_WINDOWS = ['24h', '7d', '30d'] as const;
export type TimeWindow = (typeof TIME_WINDOWS)[number];
export const DEFAULT_TIME_WINDOW: TimeWindow = '7d';

export const WORK_ORDER_FILTERS = ['all', 'open', 'completed'] as const;
export type WorkOrderFilter = (typeof WORK_ORDER_FILTERS)[number];

export const APP_VIEWS = ['search', 'detail'] as const;
export type AppView = (typeof APP_VIEWS)[number];

export type AppState = {
  view: AppView;
  query?: string;
  asset?: InstanceRef;
  /** Series the user chose to plot. Absent means "use the default selection". */
  series?: InstanceRef[];
  window?: TimeWindow;
  workOrderFilter?: WorkOrderFilter;
  /** The work order whose details dialog is open. */
  workOrder?: InstanceRef;
};

export const DEFAULT_APP_STATE: AppState = { view: 'search' };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOneOf<T extends string>(options: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && options.some((option) => option === value);
}

export function isInstanceRef(value: unknown): value is InstanceRef {
  return (
    isRecord(value) &&
    typeof value.space === 'string' &&
    value.space !== '' &&
    typeof value.externalId === 'string' &&
    value.externalId !== ''
  );
}

function isOptional<T>(value: unknown, guard: (candidate: unknown) => candidate is T): boolean {
  return value === undefined || guard(value);
}

function isInstanceRefList(value: unknown): value is InstanceRef[] {
  return Array.isArray(value) && value.every(isInstanceRef);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isAppState(value: unknown): value is AppState {
  if (!isRecord(value)) return false;
  return (
    isOneOf(APP_VIEWS, value.view) &&
    isOptional(value.query, isString) &&
    isOptional(value.asset, isInstanceRef) &&
    isOptional(value.series, isInstanceRefList) &&
    isOptional(value.window, (candidate) => isOneOf(TIME_WINDOWS, candidate)) &&
    isOptional(value.workOrderFilter, (candidate) => isOneOf(WORK_ORDER_FILTERS, candidate)) &&
    isOptional(value.workOrder, isInstanceRef)
  );
}

function toRef({ space, externalId }: InstanceRef): InstanceRef {
  return { space, externalId };
}

/**
 * Drops unknown fields from restored references, and sends a detail view
 * without an asset back to search because it cannot render.
 */
function normalize(state: AppState): AppState {
  const next: AppState = { ...state };
  if (state.asset !== undefined) next.asset = toRef(state.asset);
  if (state.series !== undefined) next.series = state.series.map(toRef);
  if (state.workOrder !== undefined) next.workOrder = toRef(state.workOrder);
  if (next.view === 'detail' && next.asset === undefined) next.view = 'search';
  return next;
}

/** Parses the host's `initialState`; anything unusable degrades to the search view. */
export function parseAppState(raw: string | undefined | null): AppState {
  if (raw === undefined || raw === null || raw === '') return DEFAULT_APP_STATE;
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    return DEFAULT_APP_STATE;
  }
  return isAppState(decoded) ? normalize(decoded) : DEFAULT_APP_STATE;
}

/** Serializes with a stable key order and without undefined fields. */
export function serializeAppState(state: AppState): string {
  const ordered: AppState = { view: state.view };
  if (state.query !== undefined && state.query !== '') ordered.query = state.query;
  if (state.asset !== undefined) ordered.asset = state.asset;
  if (state.series !== undefined) ordered.series = state.series;
  if (state.window !== undefined) ordered.window = state.window;
  if (state.workOrderFilter !== undefined) ordered.workOrderFilter = state.workOrderFilter;
  if (state.workOrder !== undefined) ordered.workOrder = state.workOrder;
  return JSON.stringify(ordered);
}
