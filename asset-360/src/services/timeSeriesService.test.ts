import { CogniteError } from '@cognite/sdk';
import { beforeEach, describe, expect, it } from 'vitest';

import { AGGREGATE_LIMIT, CdmTimeSeriesService, chunk } from './timeSeriesService';

import type { ClientStub } from '@/__mocks__/cdf';
import { aggregateResponse, createClientStub, latestResponse, listPage, makeNode } from '@/__mocks__/cdf';

const ASSET = { space: 's', externalId: 'A' };

describe(CdmTimeSeriesService.name, () => {
  let client: ClientStub;
  let service: CdmTimeSeriesService;

  beforeEach(() => {
    client = createClientStub();
    service = new CdmTimeSeriesService(client);
  });

  describe('getAssetTimeSeries', () => {
    it('filters CogniteTimeSeries on its assets list', async () => {
      await service.getAssetTimeSeries(ASSET);

      expect(client.instances.list).toHaveBeenCalledWith({
        instanceType: 'node',
        sources: [{ source: { type: 'view', space: 'cdf_cdm', externalId: 'CogniteTimeSeries', version: 'v1' } }],
        filter: {
          containsAny: { property: ['cdf_cdm', 'CogniteTimeSeries/v1', 'assets'], values: [ASSET] },
        },
        limit: 1000,
        cursor: undefined,
      });
    });

    it('maps properties and sorts by display name', async () => {
      client.instances.list.mockResolvedValueOnce(
        listPage([
          makeNode('CogniteTimeSeries', 'ts-2', { name: 'Temperature', type: 'numeric', sourceUnit: 'degC' }),
          makeNode('CogniteTimeSeries', 'ts-3', { type: 'string', isStep: true }),
          makeNode('CogniteTimeSeries', 'ts-1', { name: 'Pressure', description: 'Outlet', type: 'state' }),
          makeNode('CogniteTimeSeries', 'ts-4', { name: 'Flow' }),
        ])
      );

      const result = await service.getAssetTimeSeries(ASSET);

      expect(result).toEqual([
        { space: 'test-space', externalId: 'ts-4', name: 'Flow', description: undefined, kind: 'numeric', isStep: false, unit: undefined },
        { space: 'test-space', externalId: 'ts-1', name: 'Pressure', description: 'Outlet', kind: 'state', isStep: false, unit: undefined },
        { space: 'test-space', externalId: 'ts-2', name: 'Temperature', description: undefined, kind: 'numeric', isStep: false, unit: 'degC' },
        { space: 'test-space', externalId: 'ts-3', name: undefined, description: undefined, kind: 'string', isStep: true, unit: undefined },
      ]);
    });

    it('wraps failures', async () => {
      client.instances.list.mockRejectedValueOnce(new CogniteError('Forbidden', 403));

      await expect(service.getAssetTimeSeries(ASSET)).rejects.toMatchObject({ kind: 'no-access' });
    });
  });

  describe('getLatestDatapoints', () => {
    it('does not call CDF without ids', async () => {
      expect(await service.getLatestDatapoints([])).toEqual([]);
      expect(client.datapoints.retrieveLatest).not.toHaveBeenCalled();
    });

    it('requests by instance id in batches of 100, ignoring unknown ids', async () => {
      const ids = Array.from({ length: 150 }, (_, index) => ({ space: 's', externalId: `ts-${index}` }));

      await service.getLatestDatapoints(ids);

      expect(client.datapoints.retrieveLatest).toHaveBeenCalledTimes(2);
      const [firstItems, firstOptions] = client.datapoints.retrieveLatest.mock.calls[0];
      expect(firstItems).toHaveLength(100);
      expect(firstItems[0]).toEqual({ instanceId: { space: 's', externalId: 'ts-0' } });
      expect(firstOptions).toEqual({ ignoreUnknownIds: true });
      expect(client.datapoints.retrieveLatest.mock.calls[1][0]).toHaveLength(50);
    });

    it('maps the latest point and skips series without data', async () => {
      client.datapoints.retrieveLatest.mockResolvedValueOnce(
        latestResponse([
          { externalId: 'ts-1', timestamp: 1000, value: 4.2 },
          { externalId: 'ts-2' },
          { externalId: 'ts-3', timestamp: 2000, value: 'OPEN' },
        ])
      );

      const result = await service.getLatestDatapoints([{ space: 'test-space', externalId: 'ts-1' }]);

      expect(result).toEqual([
        { id: { space: 'test-space', externalId: 'ts-1' }, timestamp: 1000, value: 4.2 },
        { id: { space: 'test-space', externalId: 'ts-3' }, timestamp: 2000, value: 'OPEN' },
      ]);
    });

    it('wraps failures', async () => {
      client.datapoints.retrieveLatest.mockRejectedValueOnce(new CogniteError('Busy', 429));

      await expect(service.getLatestDatapoints([ASSET])).rejects.toMatchObject({ kind: 'transient' });
    });
  });

  describe('getAggregates', () => {
    it('does not call CDF without ids', async () => {
      expect(await service.getAggregates({ ids: [], start: 0, end: 1, granularity: '1h' })).toEqual([]);
      expect(client.datapoints.retrieve).not.toHaveBeenCalled();
    });

    it('requests average, min and max at the given granularity', async () => {
      await service.getAggregates({ ids: [{ space: 's', externalId: 'ts-1' }], start: 10, end: 20, granularity: '30m' });

      expect(client.datapoints.retrieve).toHaveBeenCalledWith({
        items: [{ instanceId: { space: 's', externalId: 'ts-1' } }],
        start: 10,
        end: 20,
        granularity: '30m',
        aggregates: ['average', 'min', 'max'],
        limit: AGGREGATE_LIMIT,
        ignoreUnknownIds: true,
      });
    });

    it('maps aggregate points to epoch milliseconds', async () => {
      client.datapoints.retrieve.mockResolvedValueOnce(
        aggregateResponse([
          { externalId: 'ts-1', points: [{ timestamp: 1000, average: 2, min: 1, max: 3 }, { timestamp: 2000 }] },
        ])
      );

      const result = await service.getAggregates({
        ids: [{ space: 'test-space', externalId: 'ts-1' }],
        start: 0,
        end: 3000,
        granularity: '1s',
      });

      expect(result).toEqual([
        {
          id: { space: 'test-space', externalId: 'ts-1' },
          points: [
            { timestamp: 1000, average: 2, min: 1, max: 3 },
            { timestamp: 2000, average: undefined, min: undefined, max: undefined },
          ],
        },
      ]);
    });

    it('wraps failures', async () => {
      client.datapoints.retrieve.mockRejectedValueOnce(new CogniteError('Forbidden', 403));

      await expect(
        service.getAggregates({ ids: [ASSET], start: 0, end: 1, granularity: '1h' })
      ).rejects.toMatchObject({ kind: 'no-access' });
    });
  });
});

describe(chunk.name, () => {
  it('splits into fixed-size chunks', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 2)).toEqual([]);
  });
});
