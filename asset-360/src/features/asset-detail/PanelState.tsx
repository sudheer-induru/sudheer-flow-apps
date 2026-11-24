import { Alert, AlertActions, AlertButton, AlertDescription, AlertTitle } from '@cognite/aura/components/alert';
import { EmptyState, EmptyStateDescription, EmptyStateTitle } from '@cognite/aura/components/empty-state';
import { Skeleton } from '@cognite/aura/components/skeleton';

import type { ServiceErrorKind } from '@/services/cdfError';

type PanelErrorProps = {
  /** What could not be read, e.g. "time series". */
  subject: string;
  kind: ServiceErrorKind;
  onRetry?: () => void;
};

/** Shared panel error, so no-access, transient and unknown failures read the same everywhere (SPEC FR-020). */
export function PanelError({ subject, kind, onRetry }: PanelErrorProps) {
  if (kind === 'no-access') {
    return (
      <EmptyState type="no-access">
        <EmptyStateTitle as="h3">No access to {subject}</EmptyStateTitle>
        <EmptyStateDescription>
          Your account cannot read {subject} in this project. Ask a project administrator for data model and
          time series read access.
        </EmptyStateDescription>
      </EmptyState>
    );
  }
  return (
    <Alert alertStyle="card" variant="error">
      <AlertTitle>Could not load {subject}</AlertTitle>
      <AlertDescription>
        {kind === 'transient'
          ? 'CDF timed out or throttled the request. Try again in a moment.'
          : 'An unexpected error occurred while reading from CDF.'}
      </AlertDescription>
      {onRetry !== undefined && (
        <AlertActions>
          <AlertButton onClick={onRetry} type="button">
            Try again
          </AlertButton>
        </AlertActions>
      )}
    </Alert>
  );
}

export function SkeletonRows({ count, label }: { count: number; label: string }) {
  return (
    <div aria-busy="true" aria-label={label} className="flex flex-col gap-2" role="status">
      {Array.from({ length: count }, (_, row) => (
        <Skeleton className="h-9 w-full" key={row} />
      ))}
    </div>
  );
}
