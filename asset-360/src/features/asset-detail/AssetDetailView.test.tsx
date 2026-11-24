import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AssetDetailView } from './AssetDetailView';

import type { ServiceStubs } from '@/__mocks__/providers';
import { createServiceStubs, createTestProviders } from '@/__mocks__/providers';
import type { AppState } from '@/host/hostState';
import type { WorkOrder } from '@/services/activityService';
import type { Asset } from '@/services/assetService';
import { CdfServiceError } from '@/services/cdfError';
import type { AssetTimeSeries } from '@/services/timeSeriesService';

const REF = { space: 'site', externalId: '23-VA-9110-M01' };
const DAY = 24 * 3600_000;
const LATEST = Date.UTC(2026, 5, 1);

const MOTOR: Asset = {
  ...REF,
  name: 'Compressor motor',
  description: 'Main drive',
  tags: ['critical'],
  aliases: ['VA9110'],
  parent: { space: 'site', externalId: '23-VA-9110' },
  path: [
    { space: 'site', externalId: 'PLANT' },
    { space: 'site', externalId: '23-VA-9110' },
    REF,
  ],
};

const TEMPERATURE: AssetTimeSeries = {
  space: 'site',
  externalId: 'ts-temp',
  name: 'Bearing temperature',
  kind: 'numeric',
  isStep: false,
  unit: 'degC',
};
const PRESSURE: AssetTimeSeries = { space: 'site', externalId: 'ts-pres', name: 'Discharge pressure', kind: 'numeric', isStep: false, unit: 'bar' };
const MODE: AssetTimeSeries = { space: 'site', externalId: 'ts-mode', name: 'Run mode', kind: 'string', isStep: true };

const WORK_ORDERS: WorkOrder[] = [
  { space: 'site', externalId: 'WO-1', name: 'Replace bearing', tags: ['mech'], startTime: LATEST - 10 * DAY, endTime: LATEST - 9 * DAY },
  { space: 'site', externalId: 'WO-2', name: 'Inspect coupling', tags: [], scheduledStartTime: LATEST + DAY },
];

function stubServices(): ServiceStubs {
  const services = createServiceStubs();
  services.assetService.getAsset.mockResolvedValue(MOTOR);
  services.timeSeriesService.getAssetTimeSeries.mockResolvedValue([TEMPERATURE, PRESSURE, MODE]);
  services.timeSeriesService.getLatestDatapoints.mockResolvedValue([
    { id: { space: 'site', externalId: 'ts-temp' }, timestamp: LATEST, value: 71.5 },
    { id: { space: 'site', externalId: 'ts-pres' }, timestamp: LATEST - DAY, value: 4.2 },
    { id: { space: 'site', externalId: 'ts-mode' }, timestamp: LATEST, value: 'RUNNING' },
  ]);
  services.timeSeriesService.getAggregates.mockImplementation(({ ids, start }) =>
    Promise.resolve(
      ids.map((id) => ({ id, points: [{ timestamp: start, average: 1 }, { timestamp: start + DAY, average: 2 }] }))
    )
  );
  services.activityService.getAssetWorkOrders.mockResolvedValue(WORK_ORDERS);
  return services;
}

function renderDetail(services: ServiceStubs = stubServices(), state: AppState = { view: 'detail', asset: REF }) {
  const syncInternalState = vi.fn(() => Promise.resolve(true));
  const providers = createTestProviders({ services, initialState: state, syncInternalState });
  render(<AssetDetailView asset={REF} />, { wrapper: providers.TestProviders });
  return { ...providers, syncInternalState };
}

describe(AssetDetailView.name, () => {
  it('shows the asset header with hierarchy, chips and summary figures', async () => {
    const { repository } = renderDetail();

    expect(await screen.findByRole('heading', { level: 1, name: 'Compressor motor' })).toBeInTheDocument();
    const hierarchy = screen.getByRole('navigation', { name: 'Asset hierarchy' });
    expect(within(hierarchy).getByRole('button', { name: 'PLANT' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Tags and aliases' })).toHaveTextContent('critical');
    await waitFor(() => expect(screen.getByText('Linked time series').nextSibling).toHaveTextContent('3'));
    expect(screen.getByText('Open work orders').nextSibling).toHaveTextContent('1');
    expect(repository.list()[0]).toMatchObject(REF);
  });

  it('plots the first numeric series over the week ending at its latest datapoint', async () => {
    const services = stubServices();
    renderDetail(services);

    await waitFor(() => expect(services.timeSeriesService.getAggregates).toHaveBeenCalled());
    expect(services.timeSeriesService.getAggregates).toHaveBeenCalledWith({
      ids: [{ space: 'site', externalId: 'ts-temp' }],
      start: LATEST + 1 - 7 * DAY,
      end: LATEST + 1,
      granularity: '30m',
    });
    expect(screen.getByRole('checkbox', { name: /Run mode/ })).toHaveAttribute('aria-disabled', 'true');
  });

  it('explains that nothing can be plotted when every series holds text', async () => {
    const services = stubServices();
    services.timeSeriesService.getAssetTimeSeries.mockResolvedValue([MODE]);
    renderDetail(services);

    expect(await screen.findByRole('heading', { name: 'Nothing to plot' })).toBeInTheDocument();
    expect(screen.queryByText('Pick a series to plot')).not.toBeInTheDocument();
    expect(services.timeSeriesService.getAggregates).not.toHaveBeenCalled();
  });

  it('adds a series and syncs the selection to the host', async () => {
    const { syncInternalState } = renderDetail();

    await userEvent.click(await screen.findByRole('checkbox', { name: /Discharge pressure/ }));

    expect(syncInternalState).toHaveBeenLastCalledWith(
      expect.stringContaining('"series":[{"space":"site","externalId":"ts-temp"},{"space":"site","externalId":"ts-pres"}]')
    );
    expect(await screen.findByText(/different units/)).toBeInTheDocument();
  });

  it('filters work orders and opens the details dialog', async () => {
    const { syncInternalState } = renderDetail();

    expect(await screen.findByText('Replace bearing')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: /Open/ }));
    expect(screen.queryByText('Replace bearing')).not.toBeInTheDocument();

    await userEvent.click(screen.getByText('Inspect coupling'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Planned')).toBeInTheDocument();
    expect(syncInternalState).toHaveBeenLastCalledWith(expect.stringContaining('"workOrder":{"space":"site","externalId":"WO-2"}'));
  });

  it('restores an open work order from the link', async () => {
    renderDetail(stubServices(), { view: 'detail', asset: REF, workOrder: { space: 'site', externalId: 'WO-1' } });

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Completed')).toBeInTheDocument();
  });

  it('keeps other panels working when one fails', async () => {
    const services = stubServices();
    services.activityService.getAssetWorkOrders.mockRejectedValue(new CdfServiceError('denied', { kind: 'no-access', status: 403 }));
    renderDetail(services);

    expect(await screen.findByRole('heading', { name: 'No access to work orders' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Compressor motor' })).toBeInTheDocument();
    expect(await screen.findByRole('checkbox', { name: /Bearing temperature/ })).toBeChecked();
  });

  it('explains a missing asset', async () => {
    const services = stubServices();
    services.assetService.getAsset.mockResolvedValue(null);
    renderDetail(services);

    expect(await screen.findByRole('heading', { name: 'Asset not found' })).toBeInTheDocument();
  });

  it('refreshes every panel for the asset', async () => {
    const services = stubServices();
    renderDetail(services);
    await screen.findByText('Replace bearing');

    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    await waitFor(() => expect(services.activityService.getAssetWorkOrders).toHaveBeenCalledTimes(2));
    expect(services.assetService.getAsset).toHaveBeenCalledTimes(2);
    expect(services.timeSeriesService.getAssetTimeSeries).toHaveBeenCalledTimes(2);
  });
});
