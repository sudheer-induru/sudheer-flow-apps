import type { ConnectToHostAppResult, HostAppAPI } from '@cognite/app-sdk';
import { CogniteClient } from '@cognite/sdk';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

import App from './App';

import { createServiceStubs, createTestQueryClient } from '@/__mocks__/providers';
import { serializeAppState } from '@/host/hostState';
import type { Asset } from '@/services/assetService';
import type { Services } from '@/services/ServicesContext';
import { ServicesContext } from '@/services/ServicesContext';

type AppDeps = NonNullable<ComponentProps<typeof App>['deps']>;

const MOTOR: Asset = {
  space: 'site',
  externalId: '23-VA-9110-M01',
  name: 'Compressor motor',
  tags: [],
  aliases: [],
  path: [],
};

function makeDeps(connect: () => Promise<ConnectToHostAppResult>): AppDeps {
  return {
    connectToHostApp: vi.fn<AppDeps['connectToHostApp']>(connect),
    createClient: vi.fn<AppDeps['createClient']>((config) => new CogniteClient(config)),
  };
}

function connected(): Promise<ConnectToHostAppResult> {
  const api: Partial<HostAppAPI> = {
    getProject: () => Promise.resolve('publicdatacdm'),
    getBaseUrl: () => Promise.resolve('https://cognite.test'),
    getAccessToken: () => Promise.resolve('token'),
    getAppId: () => Promise.resolve('asset-360'),
    syncInternalState: () => Promise.resolve(true),
  };
  return Promise.resolve({ api: api as HostAppAPI });
}

function renderApp(props: ComponentProps<typeof App>, services: Services = createServiceStubs()) {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <ServicesContext.Provider value={{ useServices: () => services }}>
        <App {...props} />
      </ServicesContext.Provider>
    </QueryClientProvider>
  );
}

describe('App', () => {
  it('waits for the Fusion host before rendering routes', () => {
    renderApp({ deps: makeDeps(() => new Promise(() => undefined)), connectToHostApp: () => new Promise(() => undefined) });

    expect(screen.getByText('Connecting to Cognite Data Fusion…')).toBeInTheDocument();
  });

  it('opens on search', async () => {
    renderApp({ deps: makeDeps(connected), connectToHostApp: connected });

    expect(await screen.findByRole('heading', { name: 'Asset 360' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Search assets' })).toBeInTheDocument();
  });

  it('restores a deep-linked asset', async () => {
    const services = createServiceStubs();
    services.assetService.getAsset.mockResolvedValue(MOTOR);
    const restore = async () => ({
      ...(await connected()),
      initialState: serializeAppState({ view: 'detail', asset: MOTOR }),
    });

    renderApp({ deps: makeDeps(connected), connectToHostApp: restore }, services);

    expect(await screen.findByRole('heading', { name: 'Compressor motor' })).toBeInTheDocument();
    expect(services.assetService.getAsset).toHaveBeenCalledWith({ space: 'site', externalId: '23-VA-9110-M01' });
  });
});
