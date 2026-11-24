import { describe, expect, it } from 'vitest';

import { routeReducer } from './routeState';

import type { AppState } from '@/host/hostState';

const A = { space: 's', externalId: 'A' };
const B = { space: 's', externalId: 'B' };
const TS = { space: 's', externalId: 'ts' };
const WO = { space: 's', externalId: 'WO' };

const DETAIL: AppState = {
  view: 'detail',
  query: 'pump',
  asset: A,
  series: [TS],
  window: '30d',
  workOrderFilter: 'open',
  workOrder: WO,
};

describe(routeReducer.name, () => {
  it('opens search keeping the query and asset but closing the dialog', () => {
    expect(routeReducer(DETAIL, { type: 'openSearch' })).toEqual({
      view: 'search',
      query: 'pump',
      asset: A,
      series: [TS],
      window: '30d',
      workOrderFilter: 'open',
    });
  });

  it('sets the query', () => {
    expect(routeReducer({ view: 'search' }, { type: 'setQuery', query: '23-VA' })).toEqual({
      view: 'search',
      query: '23-VA',
    });
  });

  it('opens a new asset, keeping query and window but dropping asset-specific state', () => {
    expect(routeReducer(DETAIL, { type: 'openAsset', asset: B })).toEqual({
      view: 'detail',
      query: 'pump',
      asset: B,
      window: '30d',
    });
  });

  it('reopening the same asset keeps its state', () => {
    const fromSearch = routeReducer(DETAIL, { type: 'openSearch' });

    expect(routeReducer(fromSearch, { type: 'openAsset', asset: A })).toMatchObject({
      view: 'detail',
      asset: A,
      series: [TS],
      workOrderFilter: 'open',
    });
  });

  it('opens an asset from a fresh state', () => {
    expect(routeReducer({ view: 'search' }, { type: 'openAsset', asset: A })).toEqual({ view: 'detail', asset: A });
  });

  it('sets series, window and filter', () => {
    let state = routeReducer(DETAIL, { type: 'setSeries', series: [] });
    state = routeReducer(state, { type: 'setWindow', window: '24h' });
    state = routeReducer(state, { type: 'setWorkOrderFilter', filter: 'all' });

    expect(state).toMatchObject({ series: [], window: '24h', workOrderFilter: 'all' });
  });

  it('opens and closes a work order', () => {
    const closed = routeReducer(DETAIL, { type: 'closeWorkOrder' });

    expect(closed.workOrder).toBeUndefined();
    expect(routeReducer(closed, { type: 'openWorkOrder', workOrder: WO }).workOrder).toEqual(WO);
  });
});
