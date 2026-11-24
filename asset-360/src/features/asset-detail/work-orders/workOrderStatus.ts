import type { WorkOrderFilter } from '@/host/hostState';
import type { WorkOrder } from '@/services/activityService';

export type WorkOrderStatus = 'completed' | 'in-progress' | 'planned' | 'not-scheduled';

export const WORK_ORDER_STATUS_LABEL: Record<WorkOrderStatus, string> = {
  completed: 'Completed',
  'in-progress': 'In progress',
  planned: 'Planned',
  'not-scheduled': 'Not scheduled',
};

/** CogniteActivity has no status, so it is derived from CogniteSchedulable times (SPEC FR-015). */
export function deriveWorkOrderStatus(workOrder: WorkOrder): WorkOrderStatus {
  if (workOrder.endTime !== undefined) return 'completed';
  if (workOrder.startTime !== undefined) return 'in-progress';
  if (workOrder.scheduledStartTime !== undefined) return 'planned';
  return 'not-scheduled';
}

export function isOpenStatus(status: WorkOrderStatus): boolean {
  return status === 'planned' || status === 'in-progress';
}

export function matchesFilter(status: WorkOrderStatus, filter: WorkOrderFilter): boolean {
  if (filter === 'open') return isOpenStatus(status);
  if (filter === 'completed') return status === 'completed';
  return true;
}

/** The most recent moment the work order was touched; undefined sorts last. */
export function workOrderRecency(workOrder: WorkOrder): number | undefined {
  const times = [workOrder.endTime, workOrder.startTime, workOrder.scheduledStartTime].filter(
    (time): time is number => time !== undefined
  );
  return times.length === 0 ? undefined : Math.max(...times);
}

export function compareNewestFirst(a: WorkOrder, b: WorkOrder): number {
  const left = workOrderRecency(a);
  const right = workOrderRecency(b);
  if (left === right) return a.externalId.localeCompare(b.externalId);
  if (left === undefined) return 1;
  if (right === undefined) return -1;
  return right - left;
}
