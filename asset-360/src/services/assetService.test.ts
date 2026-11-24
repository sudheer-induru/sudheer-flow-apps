import { CogniteError } from '@cognite/sdk';
import { beforeEach, describe, expect, it } from 'vitest';

import { ASSET_SEARCH_LIMIT, CdmAssetService, prefixFilter } from './assetService';

import type { ClientStub } from '@/__mocks__/cdf';
import { byIds, createClientStub, listPage, makeNode } from '@/__mocks__/cdf';

const ASSET_VIEW_REF = { type: 'view', space: 'cdf_cdm', externalId: 'CogniteAsset', version: 'v1' };

describe(CdmAssetService.name, () => {
  let client: ClientStub;
  let service: CdmAssetService;

  beforeEach(() => {
    client = createClientStub();
    service = new CdmAssetService(client);
  });

  describe('searchAssets', () => {
    it('does not call CDF for a blank query', async () => {
      expect(await service.searchAssets('   ')).toEqual([]);
      expect(client.instances.list).not.toHaveBeenCalled();
      expect(client.instances.search).not.toHaveBeenCalled();
    });

    it('sends a prefix list and an AND text search', async () => {
      await service.searchAssets(' 23-va ');

      expect(client.instances.list).toHaveBeenCalledWith({
        instanceType: 'node',
        sources: [{ source: ASSET_VIEW_REF }],
        filter: prefixFilter('23-va'),
        limit: ASSET_SEARCH_LIMIT,
      });
      expect(client.instances.search).toHaveBeenCalledWith({
        view: ASSET_VIEW_REF,
        query: '23-va',
        instanceType: 'node',
        properties: ['name', 'description'],
        operator: 'AND',
        limit: ASSET_SEARCH_LIMIT,
      });
    });

    it('merges both reads, prefix matches first, without duplicates', async () => {
      client.instances.list.mockResolvedValueOnce(
        listPage([makeNode('CogniteAsset', '23-VA-9110-M01', { name: '23-VA-9110-M01' })])
      );
      client.instances.search.mockResolvedValueOnce(
        byIds([
          makeNode('CogniteAsset', 'OTHER', { name: 'Other', description: 'Near 23-VA-9110-M01' }),
          makeNode('CogniteAsset', '23-VA-9110-M01', { name: '23-VA-9110-M01' }),
        ])
      );

      const result = await service.searchAssets('23-VA-9110-M01');

      expect(result.map((asset) => asset.externalId)).toEqual(['23-VA-9110-M01', 'OTHER']);
      expect(result[1]).toMatchObject({ name: 'Other', description: 'Near 23-VA-9110-M01' });
    });

    it('wraps a failed read in a service error', async () => {
      client.instances.search.mockRejectedValueOnce(new CogniteError('Forbidden', 403));

      await expect(service.searchAssets('pump')).rejects.toMatchObject({ kind: 'no-access' });
    });

    it('wraps a failed prefix read in a service error', async () => {
      client.instances.list.mockRejectedValueOnce(new CogniteError('Busy', 429));

      await expect(service.searchAssets('pump')).rejects.toMatchObject({ kind: 'transient' });
    });
  });

  describe('getAsset', () => {
    it('retrieves the node by id with the CogniteAsset view', async () => {
      await service.getAsset({ space: 's', externalId: 'A' });

      expect(client.instances.retrieve).toHaveBeenCalledWith({
        items: [{ instanceType: 'node', space: 's', externalId: 'A' }],
        sources: [{ source: ASSET_VIEW_REF }],
      });
    });

    it('maps the asset properties', async () => {
      client.instances.retrieve.mockResolvedValueOnce(
        byIds([
          makeNode(
            'CogniteAsset',
            'A',
            {
              name: 'Pump A',
              description: 'Feed pump',
              tags: ['critical'],
              aliases: ['P-A'],
              parent: { space: 's', externalId: 'P' },
              root: { space: 's', externalId: 'R' },
              path: [
                { space: 's', externalId: 'R' },
                { space: 's', externalId: 'P' },
              ],
            },
            's'
          ),
        ])
      );

      expect(await service.getAsset({ space: 's', externalId: 'A' })).toEqual({
        space: 's',
        externalId: 'A',
        name: 'Pump A',
        description: 'Feed pump',
        tags: ['critical'],
        aliases: ['P-A'],
        parent: { space: 's', externalId: 'P' },
        root: { space: 's', externalId: 'R' },
        path: [
          { space: 's', externalId: 'R' },
          { space: 's', externalId: 'P' },
        ],
      });
    });

    it('returns null when the asset is absent', async () => {
      client.instances.retrieve.mockResolvedValueOnce(byIds([makeNode('CogniteAsset', 'OTHER', {}, 's')]));

      expect(await service.getAsset({ space: 's', externalId: 'A' })).toBeNull();
    });

    it('wraps a failed read in a service error', async () => {
      client.instances.retrieve.mockRejectedValueOnce(new CogniteError('Server error', 500));

      await expect(service.getAsset({ space: 's', externalId: 'A' })).rejects.toMatchObject({ kind: 'transient' });
    });
  });
});

describe(prefixFilter.name, () => {
  it('matches external id and name, as typed and upper-cased', () => {
    expect(prefixFilter('23-va')).toEqual({
      or: [
        { prefix: { property: ['node', 'externalId'], value: '23-va' } },
        { prefix: { property: ['node', 'externalId'], value: '23-VA' } },
        { prefix: { property: ['cdf_cdm', 'CogniteAsset/v1', 'name'], value: '23-va' } },
        { prefix: { property: ['cdf_cdm', 'CogniteAsset/v1', 'name'], value: '23-VA' } },
      ],
    });
  });

  it('does not repeat a query that is already upper case', () => {
    expect(prefixFilter('ABC')).toEqual({
      or: [
        { prefix: { property: ['node', 'externalId'], value: 'ABC' } },
        { prefix: { property: ['cdf_cdm', 'CogniteAsset/v1', 'name'], value: 'ABC' } },
      ],
    });
  });
});
