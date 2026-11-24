import { createContext } from 'react';

import type { RouteAction } from './routeState';

import type { AppState } from '@/host/hostState';
import { DEFAULT_APP_STATE } from '@/host/hostState';

/** Shared storage for route state, so every caller of `useAppRoute` sees one value (AGENTS.md §5). */
export type AppStateContextValue = {
  state: AppState;
  dispatch: (action: RouteAction) => void;
};

export const AppStateContext = createContext<AppStateContextValue>({
  state: DEFAULT_APP_STATE,
  dispatch: () => undefined,
});
