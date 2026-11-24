import { CogniteError } from '@cognite/sdk';
import { describe, expect, it } from 'vitest';

import {
  cdmPropertyRef,
  cdmView,
  dedupeInstances,
  instanceKey,
  linkedToAssetFilter,
  listAllInstances,
  readBoolean,
  readInstance,
  readInstanceId,
  readInstanceIdList,
  readString,
  readStringList,
  readTimestamp,
  sameInstance,
} from './cdm';
import { QueuedTaskRunner } from './taskRunner';

import { createClientStub, listPage, makeNode } from '@/__mocks__/cdf';

const cdfTaskRunner = new QueuedTaskRunner(1);

describe('view references', () => {
  it('pins views to cdf_cdm v1', () => {
    expect(cdmView('CogniteAsset')).toEqual({
      type: 'view',
      space: 'cdf_cdm',
      externalId: 'CogniteAsset',
      version: 'v1',
    });
  });

  it('builds versioned property references', () => {
    expect(cdmPropertyRef('CogniteTimeSeries', 'assets')).toEqual(['cdf_cdm', 'CogniteTimeSeries/v1', 'assets']);
  });

  it('filters on the owning view assets list', () => {
    expect(linkedToAssetFilter('CogniteActivity', { space: 's', externalId: 'A' })).toEqual({
      containsAny: { property: ['cdf_cdm', 'CogniteActivity/v1', 'assets'], values: [{ space: 's', externalId: 'A' }] },
    });
  });
});

describe('instance identity', () => {
  it('builds a key from space and external id', () => {
    expect(instanceKey({ space: 's', externalId: 'A' })).toBe('s:A');
  });

  it('compares identities', () => {
    expect(sameInstance({ space: 's', externalId: 'A' }, { space: 's', externalId: 'A' })).toBe(true);
    expect(sameInstance({ space: 's', externalId: 'A' }, { space: 't', externalId: 'A' })).toBe(false);
  });

  it('dedupes by identity keeping the first occurrence', () => {
    const items = [
      { space: 's', externalId: 'A', n: 1 },
      { space: 's', externalId: 'B', n: 2 },
      { space: 's', externalId: 'A', n: 3 },
    ];

    expect(dedupeInstances(items).map((item) => item.n)).toEqual([1, 2]);
  });
});

describe(readInstance.name, () => {
  it('reads identity and the properties of one view', () => {
    const node = makeNode('CogniteAsset', 'A', { name: 'Pump' });

    expect(readInstance(node, 'CogniteAsset')).toEqual({
      id: { space: 'test-space', externalId: 'A' },
      properties: { name: 'Pump' },
    });
  });

  it('returns empty properties for another view', () => {
    const node = makeNode('CogniteAsset', 'A', { name: 'Pump' });

    expect(readInstance(node, 'CogniteActivity')?.properties).toEqual({});
  });

  it.each([null, 'x', { space: '', externalId: 'A' }, { space: 's' }, { space: 's', externalId: 5 }])(
    'rejects %j',
    (value) => {
      expect(readInstance(value, 'CogniteAsset')).toBeUndefined();
    }
  );

  it('tolerates missing property bags', () => {
    expect(readInstance({ space: 's', externalId: 'A', properties: { cdf_cdm: 'x' } }, 'CogniteAsset')).toEqual({
      id: { space: 's', externalId: 'A' },
      properties: {},
    });
  });
});

describe('property readers', () => {
  const properties = {
    name: 'Pump',
    empty: '',
    flag: true,
    tags: ['a', 3, '', 'b'],
    iso: '2024-01-02T03:04:05.000Z',
    epoch: 1000,
    badDate: 'not a date',
    infinite: Number.POSITIVE_INFINITY,
    parent: { space: 's', externalId: 'P' },
    path: [{ space: 's', externalId: 'R' }, { space: '' }, 'x', { space: 's', externalId: 'P' }],
  };

  it('reads non-empty strings', () => {
    expect(readString(properties, 'name')).toBe('Pump');
    expect(readString(properties, 'empty')).toBeUndefined();
    expect(readString(properties, 'flag')).toBeUndefined();
  });

  it('reads booleans', () => {
    expect(readBoolean(properties, 'flag')).toBe(true);
    expect(readBoolean(properties, 'name')).toBeUndefined();
  });

  it('reads string lists, dropping non-strings and blanks', () => {
    expect(readStringList(properties, 'tags')).toEqual(['a', 'b']);
    expect(readStringList(properties, 'name')).toEqual([]);
  });

  it('reads timestamps from ISO strings and numbers', () => {
    expect(readTimestamp(properties, 'iso')).toBe(Date.parse('2024-01-02T03:04:05.000Z'));
    expect(readTimestamp(properties, 'epoch')).toBe(1000);
    expect(readTimestamp(properties, 'badDate')).toBeUndefined();
    expect(readTimestamp(properties, 'infinite')).toBeUndefined();
    expect(readTimestamp(properties, 'flag')).toBeUndefined();
  });

  it('reads direct relations', () => {
    expect(readInstanceId(properties, 'parent')).toEqual({ space: 's', externalId: 'P' });
    expect(readInstanceId(properties, 'name')).toBeUndefined();
    expect(readInstanceIdList(properties, 'path')).toEqual([
      { space: 's', externalId: 'R' },
      { space: 's', externalId: 'P' },
    ]);
    expect(readInstanceIdList(properties, 'name')).toEqual([]);
  });
});

describe(listAllInstances.name, () => {
  it('follows the cursor until the last page', async () => {
    const client = createClientStub();
    client.instances.list
      .mockResolvedValueOnce(listPage([makeNode('CogniteAsset', 'A')], 'c1'))
      .mockResolvedValueOnce(listPage([makeNode('CogniteAsset', 'B')]));

    const result = await listAllInstances(client, cdfTaskRunner, { instanceType: 'node', limit: 1000 }, 'CogniteAsset');

    expect(result.map((item) => item.id.externalId)).toEqual(['A', 'B']);
    expect(client.instances.list).toHaveBeenNthCalledWith(2, expect.objectContaining({ cursor: 'c1' }));
  });

  it('stops at the item cap and shrinks the last page to fit', async () => {
    const client = createClientStub();
    client.instances.list
      .mockResolvedValueOnce(listPage([makeNode('CogniteAsset', 'A'), makeNode('CogniteAsset', 'B')], 'c1'))
      .mockResolvedValueOnce(listPage([makeNode('CogniteAsset', 'C')], 'c2'));

    const result = await listAllInstances(client, cdfTaskRunner, { instanceType: 'node', limit: 2 }, 'CogniteAsset', 3);

    expect(result.map((item) => item.id.externalId)).toEqual(['A', 'B', 'C']);
    expect(client.instances.list).toHaveBeenCalledTimes(2);
    expect(client.instances.list).toHaveBeenNthCalledWith(2, expect.objectContaining({ limit: 1, cursor: 'c1' }));
  });

  it('stops on an empty page even if a cursor is returned', async () => {
    const client = createClientStub();
    client.instances.list.mockResolvedValueOnce(listPage([], 'c1'));

    const result = await listAllInstances(client, cdfTaskRunner, { instanceType: 'node' }, 'CogniteAsset');

    expect(result).toEqual([]);
    expect(client.instances.list).toHaveBeenCalledTimes(1);
  });

  it('wraps failures in a service error', async () => {
    const client = createClientStub();
    client.instances.list.mockRejectedValueOnce(new CogniteError('Forbidden', 403));

    await expect(listAllInstances(client, cdfTaskRunner, { instanceType: 'node' }, 'CogniteAsset')).rejects.toMatchObject({
      kind: 'no-access',
    });
  });
});
