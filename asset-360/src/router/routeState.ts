import type { AppState, InstanceRef, TimeWindow, WorkOrderFilter } from '@/host/hostState';

/** Every user-driven change to host-synced state; kept pure so it is testable without React. */
export type RouteAction =
  | { type: 'openSearch' }
  | { type: 'setQuery'; query: string }
  | { type: 'openAsset'; asset: InstanceRef }
  | { type: 'setSeries'; series: InstanceRef[] }
  | { type: 'setWindow'; window: TimeWindow }
  | { type: 'setWorkOrderFilter'; filter: WorkOrderFilter }
  | { type: 'openWorkOrder'; workOrder: InstanceRef }
  | { type: 'closeWorkOrder' };

function sameRef(a: InstanceRef, b: InstanceRef): boolean {
  return a.space === b.space && a.externalId === b.externalId;
}

/**
 * Opening a different asset drops the previous asset's series, filter and open
 * work order: those references belong to the asset left behind. The time window
 * is a viewing preference and is kept.
 */
function openAsset(state: AppState, asset: InstanceRef): AppState {
  if (state.asset !== undefined && sameRef(state.asset, asset)) return { ...state, view: 'detail' };
  const next: AppState = { view: 'detail', asset };
  if (state.query !== undefined) next.query = state.query;
  if (state.window !== undefined) next.window = state.window;
  return next;
}

export function routeReducer(state: AppState, action: RouteAction): AppState {
  switch (action.type) {
    case 'openSearch': {
      const { workOrder: _closed, ...rest } = state;
      return { ...rest, view: 'search' };
    }
    case 'setQuery':
      return { ...state, query: action.query };
    case 'openAsset':
      return openAsset(state, action.asset);
    case 'setSeries':
      return { ...state, series: action.series };
    case 'setWindow':
      return { ...state, window: action.window };
    case 'setWorkOrderFilter':
      return { ...state, workOrderFilter: action.filter };
    case 'openWorkOrder':
      return { ...state, workOrder: action.workOrder };
    case 'closeWorkOrder': {
      const { workOrder: _closed, ...rest } = state;
      return rest;
    }
  }
}
