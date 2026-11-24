import type { CogniteClient } from '@cognite/sdk';
import { vi } from 'vitest';

import { CDM_SPACE, CDM_VERSION } from '@/services/cdm';

type InstancesApi = CogniteClient['instances'];
type DatapointsApi = CogniteClient['datapoints'];
type ListResponse = Awaited<ReturnType<InstancesApi['list']>>;
type ByIdsResponse = Awaited<ReturnType<InstancesApi['retrieve']>>;
type InstanceNode = ListResponse['items'][number];
type LatestResponse = Awaited<ReturnType<DatapointsApi['retrieveLatest']>>;
type RetrieveResponse = Awaited<ReturnType<DatapointsApi['retrieve']>>;

/** A DMS node as the API returns it, with properties under `cdf_cdm/<view>/v1`. */
export function makeNode(
  view: string,
  externalId: string,
  properties: Record<string, unknown> = {},
  space = 'test-space'
): InstanceNode {
  return {
    instanceType: 'node',
    space,
    externalId,
    version: 1,
    createdTime: 0,
    lastUpdatedTime: 0,
    properties: { [CDM_SPACE]: { [`${view}/${CDM_VERSION}`]: properties } },
  } as Partial<InstanceNode> as InstanceNode;
}

export function listPage(items: InstanceNode[], nextCursor?: string): ListResponse {
  return { items, nextCursor } as Partial<ListResponse> as ListResponse;
}

export function byIds(items: InstanceNode[]): ByIdsResponse {
  return { items } as Partial<ByIdsResponse> as ByIdsResponse;
}

export function latestResponse(
  series: Array<{ externalId: string; space?: string; timestamp?: number; value?: number | string }>
): LatestResponse {
  return series.map((item) => ({
    id: 1,
    isString: typeof item.value === 'string',
    instanceId: { space: item.space ?? 'test-space', externalId: item.externalId },
    datapoints:
      item.timestamp === undefined ? [] : [{ timestamp: new Date(item.timestamp), value: item.value ?? 0 }],
  })) as Partial<LatestResponse> as LatestResponse;
}

export function aggregateResponse(
  series: Array<{
    externalId: string;
    space?: string;
    points: Array<{ timestamp: number; average?: number; min?: number; max?: number }>;
  }>
): RetrieveResponse {
  return series.map((item) => ({
    id: 1,
    isString: false,
    isStep: false,
    instanceId: { space: item.space ?? 'test-space', externalId: item.externalId },
    datapoints: item.points.map((point) => ({ ...point, timestamp: new Date(point.timestamp) })),
  })) as Partial<RetrieveResponse> as RetrieveResponse;
}

export function createClientStub() {
  return {
    instances: {
      list: vi.fn<InstancesApi['list']>(() => Promise.resolve(listPage([]))),
      search: vi.fn<InstancesApi['search']>(() => Promise.resolve(byIds([]))),
      retrieve: vi.fn<InstancesApi['retrieve']>(() => Promise.resolve(byIds([]))),
    },
    datapoints: {
      retrieveLatest: vi.fn<DatapointsApi['retrieveLatest']>(() => Promise.resolve(latestResponse([]))),
      retrieve: vi.fn<DatapointsApi['retrieve']>(() => Promise.resolve(aggregateResponse([]))),
    },
  };
}

export type ClientStub = ReturnType<typeof createClientStub>;
