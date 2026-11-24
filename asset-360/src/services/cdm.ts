import type { CogniteClient } from '@cognite/sdk';

import { toCdfServiceError } from './cdfError';
import type { TaskScheduler } from './taskRunner';

/** Everything Asset 360 reads lives in the Cognite-managed Core Data Model. */
export const CDM_SPACE = 'cdf_cdm';
export const CDM_VERSION = 'v1';

/** Maximum page size of `/models/instances/list` and `/models/instances/search`. */
export const INSTANCE_PAGE_SIZE = 1000;

/**
 * Upper bound on linked series or work orders read for one asset (five pages).
 * A list this long cannot be investigated on one screen, so the UI says it was cut off.
 */
export const MAX_LINKED_INSTANCES = 5000;

/** Identity of a data modeling node: the key every panel and deep link joins on. */
export type InstanceId = {
  space: string;
  externalId: string;
};

export type ViewReference = {
  type: 'view';
  space: string;
  externalId: string;
  version: string;
};

/** A node reduced to its identity and the properties of one view. */
export type CdmInstance = {
  id: InstanceId;
  properties: Record<string, unknown>;
};

type InstancesApi = CogniteClient['instances'];

export type InstanceListParams = Parameters<InstancesApi['list']>[0];
export type InstanceSearchParams = Parameters<InstancesApi['search']>[0];
export type InstanceRetrieveParams = Parameters<InstancesApi['retrieve']>[0];
export type InstanceFilter = NonNullable<InstanceListParams['filter']>;

/** Narrow client slices, so tests supply single functions instead of a whole client. */
export type InstanceListClient = { instances: Pick<InstancesApi, 'list'> };
export type InstanceSearchClient = { instances: Pick<InstancesApi, 'search'> };
export type InstanceRetrieveClient = { instances: Pick<InstancesApi, 'retrieve'> };

export function cdmView(externalId: string): ViewReference {
  return { type: 'view', space: CDM_SPACE, externalId, version: CDM_VERSION };
}

/** A versioned view property reference; an unversioned one silently matches nothing. */
export function cdmPropertyRef(viewExternalId: string, property: string): string[] {
  return [CDM_SPACE, `${viewExternalId}/${CDM_VERSION}`, property];
}

/**
 * Filter for "instances of this view whose `assets` list contains the asset".
 *
 * `CogniteAsset.timeSeries` and `CogniteAsset.activities` are reverse direct
 * relation lists, which `/query` cannot traverse inwards, so the read starts
 * from the view that owns the `assets` relation.
 */
export function linkedToAssetFilter(viewExternalId: string, assetId: InstanceId): InstanceFilter {
  return {
    containsAny: {
      property: cdmPropertyRef(viewExternalId, 'assets'),
      values: [{ space: assetId.space, externalId: assetId.externalId }],
    },
  };
}

export function instanceKey(id: InstanceId): string {
  return `${id.space}:${id.externalId}`;
}

export function sameInstance(a: InstanceId, b: InstanceId): boolean {
  return a.space === b.space && a.externalId === b.externalId;
}

export function dedupeInstances<T extends InstanceId>(items: readonly T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = instanceKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readInstance(value: unknown, viewExternalId: string): CdmInstance | undefined {
  if (!isRecord(value)) return undefined;
  const { space, externalId } = value;
  if (typeof space !== 'string' || space === '') return undefined;
  if (typeof externalId !== 'string' || externalId === '') return undefined;
  return {
    id: { space, externalId },
    properties: readViewProperties(value.properties, viewExternalId),
  };
}

export function readInstances(values: readonly unknown[], viewExternalId: string): CdmInstance[] {
  return values.flatMap((value) => {
    const instance = readInstance(value, viewExternalId);
    return instance === undefined ? [] : [instance];
  });
}

export function readString(properties: Record<string, unknown>, key: string): string | undefined {
  const value = properties[key];
  return typeof value === 'string' && value !== '' ? value : undefined;
}

export function readBoolean(properties: Record<string, unknown>, key: string): boolean | undefined {
  const value = properties[key];
  return typeof value === 'boolean' ? value : undefined;
}

export function readStringList(properties: Record<string, unknown>, key: string): string[] {
  const value = properties[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item !== '');
}

/** Timestamps arrive as ISO-8601 strings; numbers are tolerated. Returns epoch ms. */
export function readTimestamp(properties: Record<string, unknown>, key: string): number | undefined {
  const value = properties[key];
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value !== 'string') return undefined;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function readInstanceId(properties: Record<string, unknown>, key: string): InstanceId | undefined {
  return toInstanceId(properties[key]);
}

export function readInstanceIdList(properties: Record<string, unknown>, key: string): InstanceId[] {
  const value = properties[key];
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const id = toInstanceId(item);
    return id === undefined ? [] : [id];
  });
}

/**
 * Reads pages of an instance list by following `nextCursor`, stopping at
 * `maxItems`. Callers treat a result of exactly `maxItems` as possibly truncated.
 */
export async function listAllInstances(
  client: InstanceListClient,
  scheduler: TaskScheduler,
  params: InstanceListParams,
  viewExternalId: string,
  maxItems: number = MAX_LINKED_INSTANCES
): Promise<CdmInstance[]> {
  const instances: CdmInstance[] = [];
  let cursor: string | undefined;

  try {
    do {
      const pageCursor = cursor;
      const limit = Math.min(params.limit ?? INSTANCE_PAGE_SIZE, maxItems - instances.length);
      const page = await scheduler.schedule(() => client.instances.list({ ...params, limit, cursor: pageCursor }));
      instances.push(...readInstances(page.items, viewExternalId));
      cursor = page.items.length === 0 || instances.length >= maxItems ? undefined : page.nextCursor;
    } while (cursor !== undefined);
  } catch (error) {
    throw toCdfServiceError(error);
  }

  return instances;
}

function toInstanceId(value: unknown): InstanceId | undefined {
  if (!isRecord(value)) return undefined;
  const { space, externalId } = value;
  if (typeof space !== 'string' || space === '') return undefined;
  if (typeof externalId !== 'string' || externalId === '') return undefined;
  return { space, externalId };
}

function readViewProperties(properties: unknown, viewExternalId: string): Record<string, unknown> {
  if (!isRecord(properties)) return {};
  const spaceBag = properties[CDM_SPACE];
  if (!isRecord(spaceBag)) return {};
  const viewBag = spaceBag[`${viewExternalId}/${CDM_VERSION}`];
  return isRecord(viewBag) ? viewBag : {};
}
