import type { HostAppAPI } from '@cognite/app-sdk';
import { createContext, useContext } from 'react';

/** The slice of the Fusion host API this app depends on (AGENTS.md §2–3). */
export type HostAppApi = Pick<HostAppAPI, 'syncInternalState'>;

export type HostAppContextValue = {
  /** `null` until connected, or when running outside Fusion. */
  api: HostAppApi | null;
  /** Serialized state the host recovered from the URL on this load. */
  initialState?: string;
  /** CDF project, used to scope browser storage. */
  project: string;
};

export const DEFAULT_HOST_APP_CONTEXT: HostAppContextValue = { api: null, project: 'standalone' };

export const HostAppContext = createContext<HostAppContextValue>(DEFAULT_HOST_APP_CONTEXT);

export function useHostApp(): HostAppContextValue {
  return useContext(HostAppContext);
}
