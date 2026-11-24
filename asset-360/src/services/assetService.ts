import { toCdfServiceError } from './cdfError';
import type {
  CdmInstance,
  InstanceFilter,
  InstanceId,
  InstanceListClient,
  InstanceRetrieveClient,
  InstanceSearchClient,
} from './cdm';
import {
  cdmPropertyRef,
  cdmView,
  dedupeInstances,
  readInstanceId,
  readInstanceIdList,
  readInstances,
  readString,
  readStringList,
  sameInstance,
} from './cdm';
import type { TaskScheduler } from './taskRunner';
import { cdfTaskRunner } from './taskRunner';

export const ASSET_VIEW = 'CogniteAsset';

/** Per-request ceiling for each of the two search reads; ranking happens client-side. */
export const ASSET_SEARCH_LIMIT = 25;

export type Asset = {
  space: string;
  externalId: string;
  name?: string;
  description?: string;
  tags: string[];
  aliases: string[];
  parent?: InstanceId;
  root?: InstanceId;
  path: InstanceId[];
};

export interface AssetService {
  /** Tag prefix plus free-text search on name and description (SPEC FR-001). */
  searchAssets(query: string): Promise<Asset[]>;
  /** `null` means the asset does not exist; a throw means the read failed. */
  getAsset(assetId: InstanceId): Promise<Asset | null>;
}

export type AssetServiceClient = InstanceListClient & InstanceSearchClient & InstanceRetrieveClient;

export class CdmAssetService implements AssetService {
  constructor(
    private readonly client: AssetServiceClient,
    private readonly scheduler: TaskScheduler = cdfTaskRunner
  ) {}

  async searchAssets(query: string): Promise<Asset[]> {
    const text = query.trim();
    if (text === '') return [];

    const [byPrefix, byText] = await Promise.all([this.searchByPrefix(text), this.searchByText(text)]);
    return dedupeInstances([...byPrefix, ...byText]);
  }

  async getAsset(assetId: InstanceId): Promise<Asset | null> {
    try {
      const response = await this.scheduler.schedule(() =>
        this.client.instances.retrieve({
          items: [{ instanceType: 'node', space: assetId.space, externalId: assetId.externalId }],
          sources: [{ source: cdmView(ASSET_VIEW) }],
        })
      );
      // `/byids` has no ignoreUnknownIds: a missing node is simply absent.
      const match = readInstances(response.items, ASSET_VIEW).find((instance) =>
        sameInstance(instance.id, assetId)
      );
      return match === undefined ? null : toAsset(match);
    } catch (error) {
      throw toCdfServiceError(error);
    }
  }

  /**
   * The tag is node identity, not a searchable text property, so it is matched
   * with a prefix filter. Tags are usually upper case, so the upper-cased query
   * is tried as well, and the same prefixes are applied to `name`.
   */
  private async searchByPrefix(text: string): Promise<Asset[]> {
    try {
      const response = await this.scheduler.schedule(() =>
        this.client.instances.list({
          instanceType: 'node',
          sources: [{ source: cdmView(ASSET_VIEW) }],
          filter: prefixFilter(text),
          limit: ASSET_SEARCH_LIMIT,
        })
      );
      return readInstances(response.items, ASSET_VIEW).map(toAsset);
    } catch (error) {
      throw toCdfServiceError(error);
    }
  }

  /** `operator` is sent explicitly because the service default changes in November 2026. */
  private async searchByText(text: string): Promise<Asset[]> {
    try {
      const response = await this.scheduler.schedule(() =>
        this.client.instances.search({
          view: cdmView(ASSET_VIEW),
          query: text,
          instanceType: 'node',
          properties: ['name', 'description'],
          operator: 'AND',
          limit: ASSET_SEARCH_LIMIT,
        })
      );
      return readInstances(response.items, ASSET_VIEW).map(toAsset);
    } catch (error) {
      throw toCdfServiceError(error);
    }
  }
}

export function prefixFilter(text: string): InstanceFilter {
  const variants = [...new Set([text, text.toUpperCase()])];
  const properties = [['node', 'externalId'], cdmPropertyRef(ASSET_VIEW, 'name')];
  return {
    or: properties.flatMap((property) => variants.map((value) => ({ prefix: { property, value } }))),
  };
}

export function toAsset(instance: CdmInstance): Asset {
  const { properties } = instance;
  return {
    space: instance.id.space,
    externalId: instance.id.externalId,
    name: readString(properties, 'name'),
    description: readString(properties, 'description'),
    tags: readStringList(properties, 'tags'),
    aliases: readStringList(properties, 'aliases'),
    parent: readInstanceId(properties, 'parent'),
    root: readInstanceId(properties, 'root'),
    path: readInstanceIdList(properties, 'path'),
  };
}
