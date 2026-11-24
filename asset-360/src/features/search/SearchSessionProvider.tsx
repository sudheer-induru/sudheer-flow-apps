import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';

import { SEARCH_DEBOUNCE_MS, SearchSessionContext } from './SearchSessionContext';

import { useAppRoute } from '@/router/useAppRoute';

type SearchSessionProviderProps = {
  children: ReactNode;
  debounceMs?: number;
};

/**
 * Holds the debounced query so the view model stays stateless (AGENTS.md §5).
 * A deep-linked query is settled immediately; clearing the box is never delayed.
 */
export function SearchSessionProvider({ children, debounceMs = SEARCH_DEBOUNCE_MS }: SearchSessionProviderProps) {
  const typed = (useAppRoute().state.query ?? '').trim();
  const [debounced, setDebounced] = useState(typed);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(typed), debounceMs);
    return () => clearTimeout(timer);
  }, [debounceMs, typed]);

  const settledQuery = typed === '' ? '' : debounced;
  const value = useMemo(() => ({ settledQuery }), [settledQuery]);
  return <SearchSessionContext.Provider value={value}>{children}</SearchSessionContext.Provider>;
}
