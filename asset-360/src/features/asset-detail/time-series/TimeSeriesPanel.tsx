import { Alert, AlertDescription } from '@cognite/aura/components/alert';
import { Badge } from '@cognite/aura/components/badge';
import { Card, CardContent, CardDescription, CardHeader, CardHeaderEnd, CardHeaderStart, CardTitle } from '@cognite/aura/components/card';
import { CheckboxItem, CheckboxItemControl, CheckboxItemDescription, CheckboxItemLabel } from '@cognite/aura/components/checkbox';
import { EmptyState, EmptyStateDescription, EmptyStateTitle } from '@cognite/aura/components/empty-state';
import { ScrollArea } from '@cognite/aura/components/scroll-area';
import { SegmentedControl, SegmentedControlButton, SegmentedControlList } from '@cognite/aura/components/segmented-control';
import { Skeleton } from '@cognite/aura/components/skeleton';

import { PanelError, SkeletonRows } from '../PanelState';

import { WINDOW_LABEL } from './chartWindow';
import { TimeSeriesChart } from './TimeSeriesChart';
import type { ChartModel, SeriesRow } from './useTimeSeriesPanelViewModel';
import { MAX_PLOTTED_SERIES, useTimeSeriesPanelViewModel } from './useTimeSeriesPanelViewModel';

import type { InstanceRef, TimeWindow } from '@/host/hostState';
import { TIME_WINDOWS } from '@/host/hostState';
import { formatDateTime, formatValue } from '@/lib/format';

function isTimeWindow(value: unknown): value is TimeWindow {
  return TIME_WINDOWS.some((window) => window === value);
}

export function TimeSeriesPanel({ asset }: { asset: InstanceRef }) {
  const viewModel = useTimeSeriesPanelViewModel(asset);

  return (
    <Card aria-labelledby="time-series-heading" className="min-w-0" role="region">
      <CardHeader>
        <CardHeaderStart>
          <CardTitle as="h2" id="time-series-heading">
            Time series
          </CardTitle>
          <CardDescription>
            Average values for the selected window, ending at the newest datapoint. Plot up to {MAX_PLOTTED_SERIES}{' '}
            series.
          </CardDescription>
        </CardHeaderStart>
        <CardHeaderEnd>
          <SegmentedControl
            onValueChange={(value: unknown) => {
              if (isTimeWindow(value)) viewModel.setWindow(value);
            }}
            value={viewModel.window}
          >
            <SegmentedControlList aria-label="Chart window" size="small">
              {TIME_WINDOWS.map((window) => (
                <SegmentedControlButton key={window} value={window}>
                  {WINDOW_LABEL[window]}
                </SegmentedControlButton>
              ))}
            </SegmentedControlList>
          </SegmentedControl>
        </CardHeaderEnd>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {viewModel.status === 'loading' && (
          <>
            <Skeleton aria-label="Loading chart" className="h-72 w-full" />
            <SkeletonRows count={3} label="Loading time series" />
          </>
        )}
        {viewModel.status === 'error' && (
          <PanelError kind={viewModel.errorKind ?? 'unknown'} onRetry={viewModel.retry} subject="time series" />
        )}
        {viewModel.status === 'empty' && (
          <EmptyState type="no-results">
            <EmptyStateTitle as="h3">No linked time series</EmptyStateTitle>
            <EmptyStateDescription>
              No CogniteTimeSeries lists this asset in its assets property.
            </EmptyStateDescription>
          </EmptyState>
        )}
        {viewModel.status === 'ready' && (
          <>
            <ChartArea chart={viewModel.chart} />
            {viewModel.latestFailed && (
              <Alert variant="warning">
                <AlertDescription>Latest values could not be read, so the chart cannot be placed in time.</AlertDescription>
              </Alert>
            )}
            <SeriesList
              latestLoading={viewModel.latestLoading}
              onToggle={viewModel.toggleSeries}
              rows={viewModel.rows}
              selectedCount={viewModel.selectedCount}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ChartArea({ chart }: { chart: ChartModel }) {
  switch (chart.status) {
    case 'loading':
      return <Skeleton aria-label="Loading chart" className="h-72 w-full" />;
    case 'error':
      return <PanelError kind={chart.errorKind} subject="datapoints" />;
    case 'nothing-selected':
      return (
        <EmptyState className="h-72" type="new-object">
          <EmptyStateTitle as="h3">Pick a series to plot</EmptyStateTitle>
          <EmptyStateDescription>Select one or more numeric series below.</EmptyStateDescription>
        </EmptyState>
      );
    case 'no-data':
      return (
        <EmptyState className="h-72" type="no-results">
          <EmptyStateTitle as="h3">No datapoints</EmptyStateTitle>
          <EmptyStateDescription>The selected series have no numeric datapoints in this window.</EmptyStateDescription>
        </EmptyState>
      );
    case 'ready':
      return (
        <div className="flex flex-col gap-2">
          <TimeSeriesChart lines={chart.lines} range={chart.range} rows={chart.rows} />
          <p className="text-xs text-muted-foreground">
            {formatDateTime(chart.range.start)} to {formatDateTime(chart.range.end)}
            {chart.unitsDiffer && ' · The plotted series use different units and share one axis.'}
          </p>
        </div>
      );
  }
}

type SeriesListProps = {
  rows: SeriesRow[];
  selectedCount: number;
  latestLoading: boolean;
  onToggle: (series: InstanceRef) => void;
};

function SeriesList({ rows, selectedCount, latestLoading, onToggle }: SeriesListProps) {
  const atLimit = selectedCount >= MAX_PLOTTED_SERIES;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Linked series</h3>
        <span className="text-xs text-muted-foreground">
          {selectedCount} of {MAX_PLOTTED_SERIES} plotted · {rows.length} linked
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
