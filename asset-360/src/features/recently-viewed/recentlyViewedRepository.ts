import type { InstanceRef } from '@/host/hostState';
import type { Asset } from '@/services/assetService';

export const MAX_RECENTLY_VIEWED = 10;
const STORAGE_PREFIX = 'asset-360:recently-viewed:';

export type RecentlyViewedAsset = InstanceRef & {
  name?: string;
  description?: string;
};

export type RecentlyViewedRepository = {
  list(): RecentlyViewedAsset[];
  /** Moves the asset to the front and returns the updated list. */
  record(asset: Pick<Asset, 'space' | 'externalId' | 'name' | 'description'>): RecentlyViewedAsset[];
  remove(asset: InstanceRef): RecentlyViewedAsset[];
};

function isRecentlyViewedAsset(value: unknown): value is RecentlyViewedAsset {
  if (typeof value !== 'object' || value === null) return false;
  const entry: Record<string, unknown> = { ...value };
  return (
    typeof entry.space === 'string' &&
    entry.space !== '' &&
    typeof entry.externalId === 'string' &&
    entry.externalId !== '' &&
    (entry.name === undefined || typeof entry.name === 'string') &&
    (entry.description === undefined || typeof entry.description === 'string')
  );
}

function toEntry(asset: Pick<Asset, 'space' | 'externalId' | 'name' | 'description'>): RecentlyViewedAsset {
  const entry: RecentlyViewedAsset = { space: asset.space, externalId: asset.externalId };
  if (asset.name !== undefined) entry.name = asset.name;
  if (asset.description !== undefined) entry.description = asset.description;
  return entry;
}

function isSame(a: InstanceRef, b: InstanceRef): boolean {
  return a.space === b.space && a.externalId === b.externalId;
}

/** `localStorage` can throw on access (privacy modes, sandboxed iframes). */
export function getBrowserStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/**
 * Persists recently viewed assets per CDF project (SPEC FR-005). Storage
 * failures are swallowed: the list keeps working in memory for the session.
 */
export class LocalStorageRecentlyViewedRepository implements RecentlyViewedRepository {
  private readonly key: string;
  private entries: RecentlyViewedAsset[];

  constructor(
    private readonly storage: Storage | undefined,
    project: string
  ) {
    this.key = `${STORAGE_PREFIX}${project}`;
    this.entries = this.load();
  }

  list(): RecentlyViewedAsset[] {
    return this.entries;
  }

  record(asset: Pick<Asset, 'space' | 'externalId' | 'name' | 'description'>): RecentlyViewedAsset[] {
    this.entries = [toEntry(asset), ...this.entries.filter((entry) => !isSame(entry, asset))].slice(
      0,
      MAX_RECENTLY_VIEWED
    );
    this.save();
    return this.entries;
  }

  remove(asset: InstanceRef): RecentlyViewedAsset[] {
    this.entries = this.entries.filter((entry) => !isSame(entry, asset));
    this.save();
    return this.entries;
  }

  private load(): RecentlyViewedAsset[] {
    try {
      const raw = this.storage?.getItem(this.key);
      if (raw === null || raw === undefined) return [];
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(isRecentlyViewedAsset).slice(0, MAX_RECENTLY_VIEWED) : [];
    } catch {
      return [];
    }
  }

  private save(): void {
    try {
      this.storage?.setItem(this.key, JSON.stringify(this.entries));
    } catch {
      // Quota or access errors leave the in-memory list authoritative.
    }
  }
}
