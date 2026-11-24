import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AssetDetailView } from './AssetDetailView';

import { createServiceStubs, createTestProviders } from '@/__mocks__/providers';

// Lowers the read cap so the cut-off notices can be exercised without 5,000 fixtures.
vi.mock('@/services/cdm', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  MAX_LINKED_INSTANCES: 2,
}));

const REF = { space: 'site', externalId: '23-VA-9110-M01' };

function renderAtCap() {
  const services = createServiceStubs();
  services.assetService.getAsset.mockResolvedValue({ ...REF, name: 'Compressor motor', tags: [], aliases: [], path: [] });
  services.timeSeriesService.getAssetTimeSeries.mockResolvedValue([
    { space: 'site', externalId: 'ts-a', name: 'Series A', kind: 'string', isStep: true },
    { space: 'site', externalId: 'ts-b', name: 'Series B', kind: 'string', isStep: true },
  ]);
  services.timeSeriesService.getLatestDatapoints.mockResolvedValue([]);
  services.activityService.getAssetWorkOrders.mockResolvedValue([
    { space: 'site', externalId: 'WO-1', name: 'First', tags: [] },
    { space: 'site', externalId: 'WO-2', name: 'Second', tags: [] },
  ]);
  const providers = createTestProviders({ services, initialState: { view: 'detail', asset: REF } });
  render(<AssetDetailView asset={REF} />, { wrapper: providers.TestProviders });
}

describe('AssetDetailView at the linked-instance cap', () => {
  it('says the linked lists were cut off', async () => {
    renderAtCap();

    expect(await screen.findByText(/plotted · first 2 linked/)).toBeInTheDocument();
    expect(await screen.findByText(/Only the first 2 linked work orders are shown/)).toBeInTheDocument();
    expect(screen.getByText('Linked time series').nextSibling).toHaveTextContent('2+');
  });
});
