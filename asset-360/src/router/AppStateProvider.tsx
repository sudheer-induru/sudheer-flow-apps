import type { ReactNode } from 'react';
import { useMemo, useReducer } from 'react';

import { AppStateContext } from './AppStateContext';
import { routeReducer } from './routeState';

import { useHostApp } from '@/host/HostAppContext';
import { parseAppState } from '@/host/hostState';

/**
 * Seeds route state from the host's `initialState` in the reducer initializer,
 * so the first paint already shows a deep-linked asset instead of flashing search.
 */
export function AppStateProvider({ children }: { children: ReactNode }) {
  const { initialState } = useHostApp();
  const [state, dispatch] = useReducer(routeReducer, initialState, parseAppState);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}
