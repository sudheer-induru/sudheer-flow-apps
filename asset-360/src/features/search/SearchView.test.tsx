import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SearchView } from './SearchView';

import { createMemoryRepository, createServiceStubs, createTestProviders } from '@/__mocks__/providers';
import type { Asset } from '@/services/assetService';
import { CdfServiceError } from '@/services/cdfError';

const MOTOR: Asset = {
  space: 'site',
  externalId: '23-VA-9110-M01',
  name: 'Motor for compressor',
  description: 'Main drive',
  tags: [],
  aliases: [],
  path: [],
};

function renderSearch(options: Parameters<typeof createTestProviders>[0] = {}) {
  const providers = createTestProviders(options);
  render(<SearchView debounceMs={0} />, { wrapper: providers.TestProviders });
  return providers;
}

describe(SearchView.name, () => {
  it('invites a search when nothing has been viewed', () => {
    renderSearch();

    expect(screen.getByRole('heading', { name: 'Start with a tag' })).toBeInTheDocument();
  });

  it('lists recently viewed assets and lets the user forget one', async () => {
    const repository = createMemoryRepository();
    repository.record(MOTOR);
    renderSearch({ repository });

    expect(screen.getByText('Recently viewed')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Remove Motor for compressor/ }));

    expect(screen.getByRole('heading', { name: 'Start with a tag' })).toBeInTheDocument();
  });

  it('searches the settled text and opens the chosen asset', async () => {
    const services = createServiceStubs();
    services.assetService.searchAssets.mockResolvedValue([MOTOR]);
    const syncInternalState = vi.fn(() => Promise.resolve(true));
    renderSearch({ services, syncInternalState });

    await userEvent.type(screen.getByRole('combobox', { name: 'Search assets' }), '23-va');
    await userEvent.click(await screen.findByRole('option', { name: /Motor for compressor/ }));

    expect(services.assetService.searchAssets).toHaveBeenLastCalledWith('23-va');
    expect(syncInternalState).toHaveBeenLastCalledWith(
      '{"view":"detail","query":"23-va","asset":{"space":"site","externalId":"23-VA-9110-M01"}}'
    );
  });

  it('explains when nothing matches', async () => {
    renderSearch({ initialState: { view: 'search', query: 'nothing' } });

    expect(await screen.findByRole('heading', { name: 'No assets match “nothing”' })).toBeInTheDocument();
  });

  it('shows an access error with a retry', async () => {
    const services = createServiceStubs();
    services.assetService.searchAssets.mockRejectedValueOnce(new CdfServiceError('denied', { kind: 'no-access', status: 403 }));
    services.assetService.searchAssets.mockResolvedValueOnce([MOTOR]);
    renderSearch({ services, initialState: { view: 'search', query: 'motor' } });

    expect(await screen.findByText(/do not have access to read assets/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(screen.getByRole('option', { name: /Motor for compressor/ })).toBeInTheDocument());
  });
});
