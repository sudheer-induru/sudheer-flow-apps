import { Badge } from '@cognite/aura/components/badge';
import { CheckboxItem, CheckboxItemControl, CheckboxItemDescription, CheckboxItemLabel } from '@cognite/aura/components/checkbox';
import { ScrollArea } from '@cognite/aura/components/scroll-area';
import { Skeleton } from '@cognite/aura/components/skeleton';

import type { SeriesRow } from './useTimeSeriesPanelViewModel';
import { MAX_PLOTTED_SERIES } from './useTimeSeriesPanelViewModel';

import type { InstanceRef } from '@/host/hostState';
import { formatDateTime, formatNumber, formatValue } from '@/lib/format';
import { MAX_LINKED_INSTANCES } from '@/services/cdm';

type SeriesListProps = {
  rows: SeriesRow[];
  selectedCount: number;
  latestLoading: boolean;
  truncated: boolean;
  onToggle: (series: InstanceRef) => void;
};

export function SeriesList({ rows, selectedCount, latestLoading, truncated, onToggle }: SeriesListProps) {
  const atLimit = selectedCount >= MAX_PLOTTED_SERIES;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Linked series</h3>
        <span className="text-xs text-muted-foreground">
          {selectedCount} of {MAX_PLOTTED_SERIES} plotted · {truncated ? `first ${formatNumber(MAX_LINKED_INSTANCES)}` : rows.length}{' '}
          linked
        </span>
      </div>
      <ScrollArea className="max-h-72">
        <ul aria-label="Linked time series" className="flex flex-col gap-1">
          {rows.map((row) => (
            <li key={row.key}>
              <CheckboxItem className="items-start rounded-md px-2 py-1.5">
                <CheckboxItemControl
                  checked={row.selected}
                  disabled={!row.plottable || (atLimit && !row.selected)}
                  onCheckedChange={() => onToggle(row)}
                />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <CheckboxItemLabel className="flex min-w-0 items-center gap-2">
                    {row.colorIndex !== undefined && (
                      <span
                        aria-hidden
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: `var(--color-chart-${row.colorIndex}-450)` }}
                      />
                    )}
                    <span className="truncate">{row.name ?? row.externalId}</span>
                    {!row.plottable && (
                      <Badge background variant="secondary">
                        {row.kind}
                      </Badge>
                    )}
                  </CheckboxItemLabel>
                  <CheckboxItemDescription className="flex flex-wrap gap-x-3 text-xs">
                    <span className="truncate">{row.externalId}</span>
                    <LatestValue latestLoading={latestLoading} row={row} />
                  </CheckboxItemDescription>
                </span>
              </CheckboxItem>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  );
}

function LatestValue({ row, latestLoading }: { row: SeriesRow; latestLoading: boolean }) {
  if (latestLoading) return <Skeleton className="h-3 w-24" />;
  if (row.latest === undefined) return <span>No datapoints</span>;
  return (
    <span>
      <span className="font-medium text-foreground">{formatValue(row.latest.value, row.unit)}</span> at{' '}
      {formatDateTime(row.latest.timestamp)}
    </span>
  );
}
