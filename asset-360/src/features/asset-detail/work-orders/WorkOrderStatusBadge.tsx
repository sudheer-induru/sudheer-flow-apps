import { Badge } from '@cognite/aura/components/badge';
import type { ComponentProps } from 'react';

import type { WorkOrderStatus } from './workOrderStatus';
import { WORK_ORDER_STATUS_LABEL } from './workOrderStatus';

const STATUS_VARIANT: Record<WorkOrderStatus, ComponentProps<typeof Badge>['variant']> = {
  completed: 'success',
  'in-progress': 'inProgress',
  planned: 'warning',
  'not-scheduled': 'archived',
};

export function WorkOrderStatusBadge({ status }: { status: WorkOrderStatus }) {
  return (
    <Badge background dot variant={STATUS_VARIANT[status]}>
      {WORK_ORDER_STATUS_LABEL[status]}
    </Badge>
  );
}
