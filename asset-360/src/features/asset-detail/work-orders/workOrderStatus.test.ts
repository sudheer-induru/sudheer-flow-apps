import { describe, expect, it } from 'vitest';

import { countWorkOrders, toWorkOrderRows } from './useWorkOrdersPanelViewModel';
import { compareNewestFirst, deriveWorkOrderStatus, isOpenStatus, matchesFilter } from './workOrderStatus';

import type { WorkOrder } from '@/services/activityService';

const order = (externalId: string, times: Partial<WorkOrder> = {}): WorkOrder => ({
  space: 's',
  externalId,
  tags: [],
  ...times,
});

describe(deriveWorkOrderStatus.name, () => {
  it.each([
    [{ endTime: 3, startTime: 2, scheduledStartTime: 1 }, 'completed'],
    [{ startTime: 2, scheduledStartTime: 1 }, 'in-progress'],
    [{ scheduledStartTime: 1 }, 'planned'],
    [{}, 'not-scheduled'],
  ] as const)('derives %j as %s', (times, status) => {
    expect(deriveWorkOrderStatus(order('W', times))).toBe(status);
  });
});

describe('filters', () => {
  it('treats planned and in progress as open', () => {
    expect(isOpenStatus('planned')).toBe(true);
    expect(isOpenStatus('in-progress')).toBe(true);
    expect(isOpenStatus('completed')).toBe(false);
    expect(isOpenStatus('not-scheduled')).toBe(false);
  });

  it('matches all, open and completed', () => {
    expect(matchesFilter('not-scheduled', 'all')).toBe(true);
    expect(matchesFilter('planned', 'open')).toBe(true);
    expect(matchesFilter('planned', 'completed')).toBe(false);
    expect(matchesFilter('completed', 'completed')).toBe(true);
  });
});

describe(compareNewestFirst.name, () => {
  it('sorts by the latest known time with unscheduled orders last', () => {
    const rows = [
      order('none'),
      order('old', { endTime: 10 }),
      order('planned', { scheduledStartTime: 50 }),
      order('active', { scheduledStartTime: 5, startTime: 30 }),
    ].sort(compareNewestFirst);

    expect(rows.map((row) => row.externalId)).toEqual(['planned', 'active', 'old', 'none']);
  });
});

describe(countWorkOrders.name, () => {
  it('counts each filter bucket', () => {
    const rows = toWorkOrderRows([
      order('a', { endTime: 1 }),
      order('b', { startTime: 1 }),
      order('c', { scheduledStartTime: 1 }),
      order('d'),
    ]);

    expect(countWorkOrders(rows)).toEqual({ all: 4, open: 2, completed: 1 });
  });
});
