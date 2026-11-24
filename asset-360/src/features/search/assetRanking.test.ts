import { describe, expect, it } from 'vitest';

import { rankAssets } from './assetRanking';

import type { Asset } from '@/services/assetService';

const asset = (externalId: string, name?: string): Asset => ({
  space: 's',
  externalId,
  name,
  tags: [],
  aliases: [],
  path: [],
});

describe(rankAssets.name, () => {
  it('orders exact tag, exact name, tag prefix, name prefix, then the rest', () => {
    const assets = [
      asset('X-1', 'Contains 23-va somewhere'),
      asset('Y-1', '23-VA-9110 motor'),
      asset('23-VA-9110-M01', 'Motor'),
      asset('Z-1', '23-va'),
      asset('23-VA'),
    ];

    expect(rankAssets(assets, ' 23-va ', 25).map((item) => item.externalId)).toEqual([
      '23-VA',
      'Z-1',
      '23-VA-9110-M01',
      'Y-1',
      'X-1',
    ]);
  });

  it('keeps service order within a rank and applies the limit', () => {
    const assets = [asset('B'), asset('A'), asset('C')];

    expect(rankAssets(assets, 'q', 2).map((item) => item.externalId)).toEqual(['B', 'A']);
  });
});
