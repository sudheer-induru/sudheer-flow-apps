import { Badge } from '@cognite/aura/components/badge';
import { Button } from '@cognite/aura/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@cognite/aura/components/dialog';
import type { ReactNode } from 'react';

import type { WorkOrderRow } from './useWorkOrdersPanelViewModel';
import { WorkOrderStatusBadge } from './WorkOrderStatusBadge';

import { formatDateTime } from '@/lib/format';

type WorkOrderDialogProps = {
  workOrder?: WorkOrderRow;
  onClose: () => void;
};

export function WorkOrderDialog({ workOrder, onClose }: WorkOrderDialogProps) {
  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open={workOrder !== undefined}
    >
      {workOrder !== undefined && (
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{workOrder.name ?? workOrder.externalId}</DialogTitle>
            <DialogDescription>Work order linked to this asset in CogniteActivity.</DialogDescription>
          </DialogHeader>
          <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
            <Field label="Status">
              <WorkOrderStatusBadge status={workOrder.status} />
            </Field>
            <Field label="External ID">{workOrder.externalId}</Field>
            <Field label="Source ID">{workOrder.sourceId ?? '—'}</Field>
            <Field label="Description">{workOrder.description ?? '—'}</Field>
            <Field label="Scheduled start">{formatDateTime(workOrder.scheduledStartTime)}</Field>
            <Field label="Scheduled end">{formatDateTime(workOrder.scheduledEndTime)}</Field>
            <Field label="Actual start">{formatDateTime(workOrder.startTime)}</Field>
            <Field label="Actual end">{formatDateTime(workOrder.endTime)}</Field>
            <Field label="Tags">
              {workOrder.tags.length === 0 ? (
                '—'
              ) : (
                <span className="flex flex-wrap gap-1">
                  {workOrder.tags.map((tag) => (
                    <Badge key={tag} outline variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </span>
              )}
            </Field>
          </dl>
          <DialogFooter>
            <Button onClick={onClose} variant="secondary">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </>
  );
}
