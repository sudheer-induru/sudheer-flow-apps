import type { ChartConfig } from '@cognite/aura/chart';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@cognite/aura/chart';
import { useMemo } from 'react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

import type { ChartRow } from './chartData';
import type { ChartRange } from './chartWindow';
import type { PlottedLine } from './useTimeSeriesPanelViewModel';

import { formatAxisTime, formatDateTime, formatNumber } from '@/lib/format';

type TimeSeriesChartProps = {
  rows: ChartRow[];
  lines: PlottedLine[];
  range: ChartRange;
};

export function TimeSeriesChart({ rows, lines, range }: TimeSeriesChartProps) {
  const config = useMemo<ChartConfig>(
    () =>
      Object.fromEntries(
        lines.map((line) => [
          line.dataKey,
          { label: line.unit === undefined ? line.label : `${line.label} (${line.unit})`, color: line.color },
        ])
      ),
    [lines]
  );
  const span = range.end - range.start;
  const description = `Average values of ${lines.map((line) => line.label).join(', ')} from ${formatDateTime(
    range.start
  )} to ${formatDateTime(range.end)}`;

  return (
    <ChartContainer aria-label={description} className="aspect-auto h-72 w-full" config={config}>
      <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="timestamp"
          domain={[range.start, range.end]}
          minTickGap={48}
          scale="time"
          tickFormatter={(value: number) => formatAxisTime(value, span)}
          tickLine={false}
          type="number"
        />
        <YAxis tickFormatter={(value: number) => formatNumber(value)} tickLine={false} width={64} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              indicator="line"
              labelFormatter={(_, payload) => {
                const timestamp = payload[0]?.payload?.timestamp;
                return typeof timestamp === 'number' ? formatDateTime(timestamp) : '';
              }}
              valueFormatter={(value) => (typeof value === 'number' ? formatNumber(value) : value)}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        {lines.map((line) => (
          <Line
            connectNulls
            dataKey={line.dataKey}
            dot={false}
            isAnimationActive={false}
            key={line.dataKey}
            name={line.dataKey}
            stroke={`var(--color-${line.dataKey})`}
            strokeWidth={2}
            type="monotone"
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}
