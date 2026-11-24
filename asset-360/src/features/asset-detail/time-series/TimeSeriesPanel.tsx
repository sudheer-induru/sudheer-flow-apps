import { Alert, AlertDescription } from '@cognite/aura/components/alert';
import { Card, CardContent, CardDescription, CardHeader, CardHeaderEnd, CardHeaderStart, CardTitle } from '@cognite/aura/components/card';
import { EmptyState, EmptyStateDescription, EmptyStateTitle } from '@cognite/aura/components/empty-state';
import { SegmentedControl, SegmentedControlButton, SegmentedControlList } from '@cognite/aura/components/segmented-control';
import { Skeleton } from '@cognite/aura/components/skeleton';

import { PanelError, SkeletonRows } from '../PanelState';

import { WINDOW_LABEL } from './chartWindow';
import { SeriesList } from './SeriesList';
import { TimeSeriesChart } from './TimeSeriesChart';
import type { ChartModel } from './useTimeSeriesPanelViewModel';
import { MAX_PLOTTED_SERIES, useTimeSeriesPanelViewModel } from './useTimeSeriesPanelViewModel';

import type { InstanceRef, TimeWindow } from '@/host/hostState';
import { TIME_WINDOWS } from '@/host/hostState';
import { formatDateTime } from '@/lib/format';

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
            <EmptyStateDescription>No CogniteTimeSeries lists this asset in its assets property.</EmptyStateDescription>
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
              truncated={viewModel.truncated}
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
    case 'no-numeric':
      return (
        <EmptyState className="h-72" type="no-results">
          <EmptyStateTitle as="h3">Nothing to plot</EmptyStateTitle>
          <EmptyStateDescription>
            The linked series hold text or state values. Their latest values are listed below.
          </EmptyStateDescription>
        </EmptyState>
      );
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
