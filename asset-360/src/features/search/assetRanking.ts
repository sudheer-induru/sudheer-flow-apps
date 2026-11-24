import type { Asset } from '@/services/assetService';

/** Lower is better: exact tag, exact name, tag prefix, name prefix, any other match. */
function rankOf(asset: Asset, needle: string): number {
  const tag = asset.externalId.toLowerCase();
  const name = asset.name?.toLowerCase();
  if (tag === needle) return 0;
  if (name === needle) return 1;
  if (tag.startsWith(needle)) return 2;
  if (name?.startsWith(needle) === true) return 3;
  return 4;
}

/**
 * Orders search results so an engineer typing a tag sees that asset first
 * (SPEC FR-002). The sort is stable, so the service's relevance order breaks ties.
 */
export function rankAssets(assets: readonly Asset[], query: string, limit: number): Asset[] {
  const needle = query.trim().toLowerCase();
  return assets
    .map((asset, index) => ({ asset, index, rank: rankOf(asset, needle) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .slice(0, limit)
    .map(({ asset }) => asset);
}
