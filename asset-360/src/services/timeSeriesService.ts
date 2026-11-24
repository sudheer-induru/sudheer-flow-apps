import type { CogniteClient } from '@cognite/sdk';

import { toCdfServiceError } from './cdfError';
import type { CdmInstance, InstanceId, InstanceListClient } from './cdm';
import {
  INSTANCE_PAGE_SIZE,
  cdmView,
  isRecord,
  linkedToAssetFilter,
  listAllInstances,
  readBoolean,
  readString,
} from './cdm';

export const TIME_SERIES_VIEW = 'CogniteTimeSeries';

/** `datapoints/latest` accepts at most 100 items per request. */
export const LATEST_BATCH_SIZE = 100;

/** Upper bound for aggregate datapoints per request; the API default is only 100. */
export const AGGREGATE_LIMIT = 10_000;

type DatapointsApi = CogniteClient['datapoints'];

export type TimeSeriesKind = 'numeric' | 'string' | 'state';

export type AssetTimeSeries = {
  space: string;
  externalId: string;
  name?: string;
  description?: string;
  kind: TimeSeriesKind;
  isStep: boolean;
  unit?: string;
};

export type LatestDatapoint = {
  id: InstanceId;
  timestamp: number;
  value: number | string;
};

export type AggregatePoint = {
  timestamp: number;
  average?: number;
  min?: number;
  max?: number;
};

export type SeriesAggregates = {
  id: InstanceId;
  points: AggregatePoint[];
};

export type AggregateQuery = {
  ids: InstanceId[];
  start: number;
  end: number;
  granularity: string;
};

export interface TimeSeriesService {
  getAssetTimeSeries(assetId: InstanceId): Promise<AssetTimeSeries[]>;
  /** Series without any datapoint are omitted from the result. */
  getLatestDatapoints(ids: InstanceId[]): Promise<LatestDatapoint[]>;
  getAggregates(query: AggregateQuery): Promise<SeriesAggregates[]>;
}

export type TimeSeriesServiceClient = InstanceListClient & {
  datapoints: Pick<DatapointsApi, 'retrieveLatest' | 'retrieve'>;
};

export class CdmTimeSeriesService implements TimeSeriesService {
  constructor(private readonly client: TimeSeriesServiceClient) {}

  async getAssetTimeSeries(assetId: InstanceId): Promise<AssetTimeSeries[]> {
    const instances = await listAllInstances(
      this.client,
      {
        instanceType: 'node',
        sources: [{ source: cdmView(TIME_SERIES_VIEW) }],
        filter: linkedToAssetFilter(TIME_SERIES_VIEW, assetId),
        limit: INSTANCE_PAGE_SIZE,
      },
      TIME_SERIES_VIEW
    );
    return instances.map(toAssetTimeSeries).sort(byDisplayName);
  }

  async getLatestDatapoints(ids: InstanceId[]): Promise<LatestDatapoint[]> {
    if (ids.length === 0) return [];
    try {
      const batches = chunk(ids, LATEST_BATCH_SIZE);
      const responses = await Promise.all(
        batches.map((batch) =>
          // ignoreUnknownIds: a shared link may name a series that was deleted since.
          this.client.datapoints.retrieveLatest(batch.map(toDatapointItem), { ignoreUnknownIds: true })
        )
      );
      return responses.flat().flatMap((series) => {
        const id = series.instanceId;
        const point: unknown = series.datapoints[0];
        if (id === undefined || !isRecord(point)) return [];
        const { timestamp, value } = point;
        if (!(timestamp instanceof Date)) return [];
        if (typeof value !== 'number' && typeof value !== 'string') return [];
        return [{ id: { space: id.space, externalId: id.externalId }, timestamp: timestamp.getTime(), value }];
      });
    } catch (error) {
      throw toCdfServiceError(error);
    }
  }

  async getAggregates({ ids, start, end, granularity }: AggregateQuery): Promise<SeriesAggregates[]> {
    if (ids.length === 0) return [];
    try {
      const response = await this.client.datapoints.retrieve({
        items: ids.map(toDatapointItem),
        start,
        end,
        granularity,
        aggregates: ['average', 'min', 'max'],
        limit: AGGREGATE_LIMIT,
        ignoreUnknownIds: true,
      });
      return response.flatMap((series) => {
        const id = series.instanceId;
        if (id === undefined) return [];
        const points: unknown[] = series.datapoints;
        return [{ id: { space: id.space, externalId: id.externalId }, points: points.flatMap(toAggregatePoint) }];
      });
    } catch (error) {
      throw toCdfServiceError(error);
    }
  }
}

function toAssetTimeSeries(instance: CdmInstance): AssetTimeSeries {
  const { properties } = instance;
  return {
    space: instance.id.space,
    externalId: instance.id.externalId,
    name: readString(properties, 'name'),
    description: readString(properties, 'description'),
    kind: toKind(readString(properties, 'type')),
    isStep: readBoolean(properties, 'isStep') ?? false,
    unit: readString(properties, 'sourceUnit'),
  };
}

function toKind(type: string | undefined): TimeSeriesKind {
  if (type === 'string' || type === 'state') return type;
  return 'numeric';
}

function byDisplayName(a: AssetTimeSeries, b: AssetTimeSeries): number {
  return (a.name ?? a.externalId).localeCompare(b.name ?? b.externalId, undefined, { numeric: true });
}

function toDatapointItem(id: InstanceId): { instanceId: InstanceId } {
  return { instanceId: { space: id.space, externalId: id.externalId } };
}

function toAggregatePoint(point: unknown): AggregatePoint[] {
  if (!isRecord(point) || !(point.timestamp instanceof Date)) return [];
  return [
    {
      timestamp: point.timestamp.getTime(),
      average: finiteOrUndefined(point.average),
      min: finiteOrUndefined(point.min),
      max: finiteOrUndefined(point.max),
    },
  ];
}

function finiteOrUndefined(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}
