import { Card, CardContent, CardDescription, CardHeader, CardHeaderEnd, CardHeaderStart, CardTitle } from '@cognite/aura/components/card';
import { SegmentedControl, SegmentedControlButton, SegmentedControlList } from '@cognite/aura/components/segmented-control';
import type { DataGridColumnDef } from '@cognite/aura/data-grid';
import { DataGrid } from '@cognite/aura/data-grid';

import { PanelError } from '../PanelState';

import type { WorkOrderRow } from './useWorkOrdersPanelViewModel';
import { useWorkOrdersPanelViewModel } from './useWorkOrdersPanelViewModel';
import { WorkOrderDialog } from './WorkOrderDialog';
import { WorkOrderStatusBadge } from './WorkOrderStatusBadge';

import type { InstanceRef, WorkOrderFilter } from '@/host/hostState';
import { WORK_ORDER_FILTERS } from '@/host/hostState';
import { formatDateTime } from '@/lib/format';

const FILTER_LABEL: Record<WorkOrderFilter, string> = {
  all: 'All',
  open: 'Open',
  completed: 'Completed',
};

const EMPTY_TEXT: Record<WorkOrderFilter, { title: string; description: string }> = {
  all: { title: 'No work orders', description: 'No CogniteActivity lists this asset in its assets property.' },
  open: { title: 'No open work orders', description: 'Nothing is planned or in progress for this asset.' },
  completed: { title: 'No completed work orders', description: 'No work order for this asset has an end time.' },
};

function isWorkOrderFilter(value: unknown): value is WorkOrderFilter {
  return WORK_ORDER_FILTERS.some((filter) => filter === value);
}

const COLUMNS: DataGridColumnDef<WorkOrderRow>[] = [
  {
    id: 'name',
    header: 'Work order',
    accessorFn: (row) => row.name ?? row.externalId,
    cell: ({ row }) => (
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium">{row.original.name ?? row.original.externalId}</span>
        {row.original.name !== undefined && (
          <span className="truncate text-xs text-muted-foreground">{row.original.externalId}</span>
        )}
      </span>
    ),
    size: 280,
  },
  {
    id: 'status',
    header: 'Status',
    accessorKey: 'status',
    cell: ({ row }) => <WorkOrderStatusBadge status={row.original.status} />,
    enableSorting: false,
    size: 150,
  },
  {
    id: 'scheduledStartTime',
    header: 'Scheduled start',
    accessorFn: (row) => row.scheduledStartTime,
    cell: ({ row }) => formatDateTime(row.original.scheduledStartTime),
    sortUndefined: 'last',
    size: 170,
  },
  {
    id: 'startTime',
    header: 'Actual start',
    accessorFn: (row) => row.startTime,
    cell: ({ row }) => formatDateTime(row.original.startTime),
    sortUndefined: 'last',
    size: 170,
  },
  {
    id: 'endTime',
    header: 'Actual end',
    accessorFn: (row) => row.endTime,
    cell: ({ row }) => formatDateTime(row.original.endTime),
    sortUndefined: 'last',
    size: 170,
  },
];

export function WorkOrdersPanel({ asset }: { asset: InstanceRef }) {
  const viewModel = useWorkOrdersPanelViewModel(asset);
  const empty = EMPTY_TEXT[viewModel.filter];

  return (
    <Card aria-labelledby="work-orders-heading" className="min-w-0" role="region">
      <CardHeader>
        <CardHeaderStart>
          <CardTitle as="h2" id="work-orders-heading">
            Work orders
          </CardTitle>
          <CardDescription>Newest first. Select a row for details.</CardDescription>
        </CardHeaderStart>
        <CardHeaderEnd>
          <SegmentedControl
            onValueChange={(value: unknown) => {
              if (isWorkOrderFilter(value)) viewModel.setFilter(value);
            }}
            value={viewModel.filter}
          >
            <SegmentedControlList aria-label="Filter work orders" size="small">
              {WORK_ORDER_FILTERS.map((filter) => (
                <SegmentedControlButton key={filter} value={filter}>
                  {FILTER_LABEL[filter]}
                  {viewModel.status === 'ready' && (
                    <span className="ml-1 tabular-nums text-muted-foreground">{viewModel.counts[filter]}</span>
                  )}
                </SegmentedControlButton>
              ))}
            </SegmentedControlList>
          </SegmentedControl>
        </CardHeaderEnd>
      </CardHeader>
      <CardContent>
        {viewModel.status === 'error' ? (
          <PanelError kind={viewModel.errorKind ?? 'unknown'} onRetry={viewModel.retry} subject="work orders" />
        ) : (
          <DataGrid
            aria-label="Work orders"
            className="max-h-[28rem]"
            columns={COLUMNS}
            data={viewModel.rows}
            emptyState={empty}
            getRowId={(row) => row.key}
            loading={viewModel.status === 'loading'}
            loadingRowCount={5}
            onRowClick={(row) => viewModel.open(row.original)}
            size="compact"
            striped
          />
        )}
      </CardContent>
      <WorkOrderDialog onClose={viewModel.close} workOrder={viewModel.openWorkOrder} />
    </Card>
  );
}
