import { CogniteError } from '@cognite/sdk';
import { beforeEach, describe, expect, it } from 'vitest';

import { CdmActivityService } from './activityService';

import type { ClientStub } from '@/__mocks__/cdf';
import { createClientStub, listPage, makeNode } from '@/__mocks__/cdf';

const ASSET = { space: 's', externalId: 'A' };

describe(CdmActivityService.name, () => {
  let client: ClientStub;
  let service: CdmActivityService;

  beforeEach(() => {
    client = createClientStub();
    service = new CdmActivityService(client);
  });

  it('filters CogniteActivity on its assets list', async () => {
    await service.getAssetWorkOrders(ASSET);

    expect(client.instances.list).toHaveBeenCalledWith({
      instanceType: 'node',
      sources: [{ source: { type: 'view', space: 'cdf_cdm', externalId: 'CogniteActivity', version: 'v1' } }],
      filter: { containsAny: { property: ['cdf_cdm', 'CogniteActivity/v1', 'assets'], values: [ASSET] } },
      limit: 1000,
      cursor: undefined,
    });
  });

  it('maps describable, sourceable and schedulable properties', async () => {
    client.instances.list.mockResolvedValueOnce(
      listPage([
        makeNode('CogniteActivity', 'WO-1', {
          name: 'Replace seal',
          description: 'Leak at pump seal',
          sourceId: '100234',
          tags: ['mechanical'],
          startTime: '2024-01-02T00:00:00.000Z',
          endTime: '2024-01-03T00:00:00.000Z',
          scheduledStartTime: '2024-01-01T00:00:00.000Z',
          scheduledEndTime: '2024-01-04T00:00:00.000Z',
        }),
      ])
    );

    expect(await service.getAssetWorkOrders(ASSET)).toEqual([
      {
        space: 'test-space',
        externalId: 'WO-1',
        name: 'Replace seal',
        description: 'Leak at pump seal',
        sourceId: '100234',
        tags: ['mechanical'],
        startTime: Date.parse('2024-01-02T00:00:00.000Z'),
        endTime: Date.parse('2024-01-03T00:00:00.000Z'),
        scheduledStartTime: Date.parse('2024-01-01T00:00:00.000Z'),
        scheduledEndTime: Date.parse('2024-01-04T00:00:00.000Z'),
      },
    ]);
  });

  it('wraps failures', async () => {
    client.instances.list.mockRejectedValueOnce(new CogniteError('Forbidden', 403));

    await expect(service.getAssetWorkOrders(ASSET)).rejects.toMatchObject({ kind: 'no-access' });
  });
});
