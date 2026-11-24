import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useAppRoute } from './useAppRoute';

import { createTestProviders } from '@/__mocks__/providers';

const A = { space: 's', externalId: 'A' };

describe(useAppRoute.name, () => {
  it('starts from the deep-linked state without syncing it back', () => {
    const syncInternalState = vi.fn(() => Promise.resolve(true));
    const { TestProviders } = createTestProviders({
      initialState: { view: 'detail', asset: A, window: '30d' },
      syncInternalState,
    });

    const { result } = renderHook(() => useAppRoute(), { wrapper: TestProviders });

    expect(result.current.state).toEqual({ view: 'detail', asset: A, window: '30d' });
    expect(syncInternalState).not.toHaveBeenCalled();
  });

  it('updates the shared state and syncs the serialized result to the host', () => {
    const syncInternalState = vi.fn(() => Promise.resolve(true));
    const { TestProviders } = createTestProviders({ syncInternalState });
    const { result } = renderHook(() => useAppRoute(), { wrapper: TestProviders });

    const assetWithExtraFields = { ...A, name: 'not part of the route' };
    act(() => result.current.openAsset(assetWithExtraFields));

    expect(result.current.state).toEqual({ view: 'detail', asset: A });
    expect(syncInternalState).toHaveBeenLastCalledWith('{"view":"detail","asset":{"space":"s","externalId":"A"}}');

    act(() => result.current.setWindow('24h'));
    act(() => result.current.openWorkOrder({ space: 's', externalId: 'WO' }));
    act(() => result.current.closeWorkOrder());
    act(() => result.current.openSearch());

    expect(result.current.state).toEqual({ view: 'search', asset: A, window: '24h' });
    expect(syncInternalState).toHaveBeenCalledTimes(5);
  });
});
