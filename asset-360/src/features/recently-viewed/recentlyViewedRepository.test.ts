import { describe, expect, it } from 'vitest';

import { LocalStorageRecentlyViewedRepository, MAX_RECENTLY_VIEWED } from './recentlyViewedRepository';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length(): number {
    return this.values.size;
  }
  clear(): void {
    this.values.clear();
  }
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.values.delete(key);
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

class ThrowingStorage extends MemoryStorage {
  override getItem(): string | null {
    throw new Error('denied');
  }
  override setItem(): void {
    throw new Error('quota');
  }
}

const asset = (externalId: string, name?: string) => ({ space: 's', externalId, name });

describe(LocalStorageRecentlyViewedRepository.name, () => {
  it('records most recent first', () => {
    const repository = new LocalStorageRecentlyViewedRepository(new MemoryStorage(), 'p');
    repository.record(asset('A', 'Alpha'));

    expect(repository.record(asset('B')).map((entry) => entry.externalId)).toEqual(['B', 'A']);
  });

  it('moves a reopened asset to the front with its latest name', () => {
    const repository = new LocalStorageRecentlyViewedRepository(new MemoryStorage(), 'p');
    repository.record(asset('A', 'Old'));
    repository.record(asset('B'));

    const entries = repository.record(asset('A', 'New'));

    expect(entries.map((entry) => entry.externalId)).toEqual(['A', 'B']);
    expect(entries[0]?.name).toBe('New');
  });

  it(`keeps at most ${MAX_RECENTLY_VIEWED} entries`, () => {
    const repository = new LocalStorageRecentlyViewedRepository(new MemoryStorage(), 'p');
    for (let index = 0; index <= MAX_RECENTLY_VIEWED; index += 1) repository.record(asset(`A-${index}`));

    expect(repository.list()).toHaveLength(MAX_RECENTLY_VIEWED);
    expect(repository.list()[MAX_RECENTLY_VIEWED - 1]?.externalId).toBe('A-1');
  });

  it('persists per project', () => {
    const storage = new MemoryStorage();
    new LocalStorageRecentlyViewedRepository(storage, 'p1').record(asset('A', 'Alpha'));

    expect(new LocalStorageRecentlyViewedRepository(storage, 'p1').list()).toEqual([
      { space: 's', externalId: 'A', name: 'Alpha' },
    ]);
    expect(new LocalStorageRecentlyViewedRepository(storage, 'p2').list()).toEqual([]);
  });

  it('drops malformed stored entries', () => {
    const storage = new MemoryStorage();
    storage.setItem('asset-360:recently-viewed:p', JSON.stringify([{ space: 's' }, { space: 's', externalId: 'A' }]));
    storage.setItem('asset-360:recently-viewed:q', '{not json');

    expect(new LocalStorageRecentlyViewedRepository(storage, 'p').list()).toEqual([{ space: 's', externalId: 'A' }]);
    expect(new LocalStorageRecentlyViewedRepository(storage, 'q').list()).toEqual([]);
  });

  it('works in memory when storage throws or is missing', () => {
    for (const storage of [new ThrowingStorage(), undefined]) {
      const repository = new LocalStorageRecentlyViewedRepository(storage, 'p');
      repository.record(asset('A'));
      repository.record(asset('B'));

      expect(repository.remove(asset('A')).map((entry) => entry.externalId)).toEqual(['B']);
    }
  });
});
