import { useCallback, useMemo } from 'react';

import { useWorkOrdersQuery } from '../assetQueries';

import type { WorkOrderStatus } from './workOrderStatus';
import { compareNewestFirst, deriveWorkOrderStatus, isOpenStatus, matchesFilter } from './workOrderStatus';

import type { InstanceRef, WorkOrderFilter } from '@/host/hostState';
import { useAppRoute } from '@/router/useAppRoute';
import type { WorkOrder } from '@/services/activityService';
import type { ServiceErrorKind } from '@/services/cdfError';
import { errorKindOf } from '@/services/cdfError';
import { instanceKey, sameInstance } from '@/services/cdm';

export type WorkOrderRow = WorkOrder & {
  key: string;
  status: WorkOrderStatus;
};

export type WorkOrderCounts = Record<WorkOrderFilter, number>;

export type WorkOrdersPanelViewModel = {
  status: 'loading' | 'error' | 'ready';
  errorKind?: ServiceErrorKind;
  rows: WorkOrderRow[];
  counts: WorkOrderCounts;
  filter: WorkOrderFilter;
  openWorkOrder?: WorkOrderRow;
  setFilter: (filter: WorkOrderFilter) => void;
  open: (workOrder: InstanceRef) => void;
  close: () => void;
  retry: () => void;
};

export function toWorkOrderRows(workOrders: readonly WorkOrder[]): WorkOrderRow[] {
  return [...workOrders]
    .sort(compareNewestFirst)
    .map((workOrder) => ({ ...workOrder, key: instanceKey(workOrder), status: deriveWorkOrderStatus(workOrder) }));
}

export function countWorkOrders(rows: readonly WorkOrderRow[]): WorkOrderCounts {
  return {
    all: rows.length,
    open: rows.filter((row) => isOpenStatus(row.status)).length,
    completed: rows.filter((row) => row.status === 'completed').length,
  };
}

/** Work orders for one asset (SPEC FR-013–FR-017); filter and open dialog are host-synced. */
export function useWorkOrdersPanelViewModel(asset: InstanceRef): WorkOrdersPanelViewModel {
  const { state, setWorkOrderFilter, openWorkOrder, closeWorkOrder } = useAppRoute();
  const query = useWorkOrdersQuery(asset);
  const filter = state.workOrderFilter ?? 'all';

  const allRows = useMemo(() => toWorkOrderRows(query.data ?? []), [query.data]);
  const rows = useMemo(() => allRows.filter((row) => matchesFilter(row.status, filter)), [allRows, filter]);
  const counts = useMemo(() => countWorkOrders(allRows), [allRows]);
  const selected = state.workOrder;
  const openRow = useMemo(
    () => (selected === undefined ? undefined : allRows.find((row) => sameInstance(row, selected))),
    [allRows, selected]
  );

  const { refetch } = query;
  const retry = useCallback(() => void refetch(), [refetch]);

  return {
    status: query.isPending ? 'loading' : query.isError ? 'error' : 'ready',
    errorKind: query.isError ? (errorKindOf(query.error) ?? 'unknown') : undefined,
    rows,
    counts,
    filter,
    openWorkOrder: openRow,
    setFilter: setWorkOrderFilter,
    open: openWorkOrder,
    close: closeWorkOrder,
    retry,
  };
}
