import { describe, expect, it } from 'vitest';

import type { AppState } from './hostState';
import { DEFAULT_APP_STATE, isAppState, isInstanceRef, parseAppState, serializeAppState } from './hostState';

const ASSET = { space: 's', externalId: 'A' };

describe(isInstanceRef.name, () => {
  it('accepts a non-empty space and external id', () => {
    expect(isInstanceRef(ASSET)).toBe(true);
  });

  it.each([null, [], 'A', { space: '', externalId: 'A' }, { space: 's', externalId: '' }, { space: 's' }])(
    'rejects %j',
    (value) => {
      expect(isInstanceRef(value)).toBe(false);
    }
  );
});

describe(isAppState.name, () => {
  it('accepts a complete state', () => {
    const state: AppState = {
      view: 'detail',
      query: 'pump',
      asset: ASSET,
      series: [{ space: 's', externalId: 'ts' }],
      window: '30d',
      workOrderFilter: 'open',
      workOrder: { space: 's', externalId: 'WO' },
    };

    expect(isAppState(state)).toBe(true);
  });

  it.each([
    ['unknown view', { view: 'map' }],
    ['non-string query', { view: 'search', query: 3 }],
    ['bad asset', { view: 'detail', asset: { space: 's' } }],
    ['bad series', { view: 'detail', asset: ASSET, series: [{ space: 's' }] }],
    ['bad window', { view: 'detail', asset: ASSET, window: '1y' }],
    ['bad filter', { view: 'detail', asset: ASSET, workOrderFilter: 'mine' }],
    ['bad work order', { view: 'detail', asset: ASSET, workOrder: 'WO' }],
    ['array', []],
  ])('rejects %s', (_label, value) => {
    expect(isAppState(value)).toBe(false);
  });
});

describe(parseAppState.name, () => {
  it.each([undefined, null, '', '{not json', '{"view":"nope"}'])('falls back to search for %j', (raw) => {
    expect(parseAppState(raw)).toEqual(DEFAULT_APP_STATE);
  });

  it('restores a detail state', () => {
    expect(parseAppState(JSON.stringify({ view: 'detail', asset: ASSET, window: '24h' }))).toEqual({
      view: 'detail',
      asset: ASSET,
      window: '24h',
    });
  });

  it('normalizes a detail view without an asset to search', () => {
    expect(parseAppState(JSON.stringify({ view: 'detail', query: 'x' }))).toEqual({ view: 'search', query: 'x' });
  });
});

describe(serializeAppState.name, () => {
  it('round-trips through parseAppState', () => {
    const state: AppState = { view: 'detail', asset: ASSET, series: [], window: '7d', workOrderFilter: 'completed' };

    expect(parseAppState(serializeAppState(state))).toEqual(state);
  });

  it('emits keys in a stable order and drops an empty query', () => {
    const serialized = serializeAppState({
      workOrder: { space: 's', externalId: 'WO' },
      asset: ASSET,
      query: '',
      view: 'detail',
    });

    expect(serialized).toBe(
      '{"view":"detail","asset":{"space":"s","externalId":"A"},"workOrder":{"space":"s","externalId":"WO"}}'
    );
  });
});
