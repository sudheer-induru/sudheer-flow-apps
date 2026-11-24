import { createContext } from 'react';

export const SEARCH_DEBOUNCE_MS = 300;

export type SearchSession = {
  /** Text the user stopped typing on for the debounce window; what CDF is queried with. */
  settledQuery: string;
};

export const SearchSessionContext = createContext<SearchSession>({ settledQuery: '' });
