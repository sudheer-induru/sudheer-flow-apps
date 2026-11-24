import { useCallback, useContext, useMemo } from 'react';

import { AppStateContext } from './AppStateContext';
import type { RouteAction } from './routeState';
import { routeReducer } from './routeState';

import { useHostApp } from '@/host/HostAppContext';
import type { AppState, InstanceRef, TimeWindow, WorkOrderFilter } from '@/host/hostState';
import { serializeAppState } from '@/host/hostState';

export type AppRoute = {
  state: AppState;
  openSearch: () => void;
  setQuery: (query: string) => void;
  openAsset: (asset: InstanceRef) => void;
  setSeries: (series: InstanceRef[]) => void;
  setWindow: (window: TimeWindow) => void;
  setWorkOrderFilter: (filter: WorkOrderFilter) => void;
  openWorkOrder: (workOrder: InstanceRef) => void;
  closeWorkOrder: () => void;
};

/**
 * Navigation view model. Each action updates the shared store and pushes the
 * resulting state to the host, computed with the same reducer so the URL always
 * matches the transition. Restoring a deep link never writes back to the host.
 */
export function useAppRoute(): AppRoute {
  const { state, dispatch } = useContext(AppStateContext);
  const { api } = useHostApp();

  const run = useCallback(
    (action: RouteAction) => {
      dispatch(action);
      void api?.syncInternalState(serializeAppState(routeReducer(state, action)));
    },
    [api, dispatch, state]
  );

  return useMemo(
    () => ({
      state,
      openSearch: () => run({ type: 'openSearch' }),
      setQuery: (query: string) => run({ type: 'setQuery', query }),
      openAsset: (asset: InstanceRef) =>
        run({ type: 'openAsset', asset: { space: asset.space, externalId: asset.externalId } }),
      setSeries: (series: InstanceRef[]) =>
        run({ type: 'setSeries', series: series.map((ref) => ({ space: ref.space, externalId: ref.externalId })) }),
      setWindow: (window: TimeWindow) => run({ type: 'setWindow', window }),
      setWorkOrderFilter: (filter: WorkOrderFilter) => run({ type: 'setWorkOrderFilter', filter }),
      openWorkOrder: (workOrder: InstanceRef) =>
        run({ type: 'openWorkOrder', workOrder: { space: workOrder.space, externalId: workOrder.externalId } }),
      closeWorkOrder: () => run({ type: 'closeWorkOrder' }),
    }),
    [run, state]
  );
}
