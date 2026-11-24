import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TimeSeriesPanel } from './TimeSeriesPanel';

import type { ServiceStubs } from '@/__mocks__/providers';
import { createServiceStubs, createTestProviders } from '@/__mocks__/providers';
import { CdfServiceError } from '@/services/cdfError';

const ASSET = { space: 'site', externalId: '23-VA-9110-M01' };
const LATEST = Date.UTC(2026, 5, 1);
const HOUR = 3600_000;

function stubServices(): ServiceStubs {
  const services = createServiceStubs();
  services.timeSeriesService.getAssetTimeSeries.mockResolvedValue([
    { space: 'site', externalId: 'ts-temp', name: 'Bearing temperature', kind: 'numeric', isStep: false, unit: 'degC' },
  ]);
  services.timeSeriesService.getLatestDatapoints.mockResolvedValue([
    { id: { space: 'site', externalId: 'ts-temp' }, timestamp: LATEST, value: 71.5 },
  ]);
  services.timeSeriesService.getAggregates.mockResolvedValue([]);
  return services;
}

function renderPanel(services: ServiceStubs) {
  const syncInternalState = vi.fn(() => Promise.resolve(true));
  const providers = createTestProviders({ services, initialState: { view: 'detail', asset: ASSET }, syncInternalState });
  render(<TimeSeriesPanel asset={ASSET} />, { wrapper: providers.TestProviders });
  return { syncInternalState };
}

describe(TimeSeriesPanel.name, () => {
  it('switches to the last 24 hours with 5 minute averages', async () => {
    const services = stubServices();
    const { syncInternalState } = renderPanel(services);
    await screen.findByRole('checkbox', { name: /Bearing temperature/ });

    await userEvent.click(screen.getByRole('tab', { name: '24 hours' }));

    await waitFor(() =>
      expect(services.timeSeriesService.getAggregates).toHaveBeenLastCalledWith(
        expect.objectContaining({ start: LATEST + 1 - 24 * HOUR, end: LATEST + 1, granularity: '5m' })
      )
    );
    expect(syncInternalState).toHaveBeenLastCalledWith(expect.stringContaining('"window":"24h"'));
  });

  it('says when the plotted series have no datapoints in the window', async () => {
    renderPanel(stubServices());

    expect(await screen.findByRole('heading', { name: 'No datapoints' })).toBeInTheDocument();
  });

  it('says when no time series is linked to the asset', async () => {
    const services = stubServices();
    services.timeSeriesService.getAssetTimeSeries.mockResolvedValue([]);
    renderPanel(services);

    expect(await screen.findByRole('heading', { name: 'No linked time series' })).toBeInTheDocument();
  });

  it('warns when latest values cannot be read', async () => {
    const services = stubServices();
    services.timeSeriesService.getLatestDatapoints.mockRejectedValue(new CdfServiceError('busy', { kind: 'transient', status: 503 }));
    renderPanel(services);

    expect(await screen.findByText(/Latest values could not be read/)).toBeInTheDocument();
  });
});
