import type { HostAppAPI } from '@cognite/app-sdk';
import { connectToHostApp as connectToHostAppImpl } from '@cognite/app-sdk';
import { CogniteSdkProvider } from '@cognite/app-sdk/react';
// Import per-component, not from the `@cognite/aura/components` barrel: the
// barrel pulls in Aura's whole dependency graph (including large libraries like
// mermaid and shiki), which slows the build and can exhaust memory in CI.
import { Alert, AlertDescription, AlertTitle } from '@cognite/aura/components/alert';
import { Loader } from '@cognite/aura/components/loader';
import type { ComponentProps } from 'react';
import { useEffect, useMemo, useState } from 'react';

import type { AppErrorBoundaryDeps } from '@/errors/AppErrorBoundary';
import { AppErrorBoundary } from '@/errors/AppErrorBoundary';
import { RecentlyViewedProvider } from '@/features/recently-viewed/RecentlyViewedProvider';
import type { HostAppContextValue } from '@/host/HostAppContext';
import { HostAppContext } from '@/host/HostAppContext';
import { AppRouter } from '@/router/AppRouter';
import { AppStateProvider } from '@/router/AppStateProvider';

type AppConnectResult = { api: Pick<HostAppAPI, 'syncInternalState' | 'getProject'>; initialState?: string };

const loadingFallback = (
  <main className="flex min-h-screen items-center justify-center bg-muted/50 text-foreground">
    <div aria-live="polite" className="inline-flex items-center gap-3 text-muted-foreground" role="status">
      <Loader size={20} />
      <span>Connecting to Cognite Data Fusion…</span>
    </div>
  </main>
);

const errorFallback = (
  <main className="flex min-h-screen items-center justify-center bg-muted/50 p-6 text-foreground">
    <Alert alertStyle="card" className="max-w-md" variant="error">
      <AlertTitle>Could not connect to Fusion</AlertTitle>
      <AlertDescription>Open Asset 360 from Cognite Data Fusion so it can sign in on your behalf.</AlertDescription>
    </Alert>
  </main>
);

type AppProps = {
  deps?: ComponentProps<typeof CogniteSdkProvider>['deps'];
  connectToHostApp?: () => Promise<AppConnectResult>;
  errorBoundaryDeps?: Partial<AppErrorBoundaryDeps>;
};

async function readProject(api: AppConnectResult['api']): Promise<string> {
  try {
    return await api.getProject();
  } catch {
    return 'standalone';
  }
}

function App({ deps, connectToHostApp = deps?.connectToHostApp ?? connectToHostAppImpl, errorBoundaryDeps }: AppProps) {
  const [host, setHost] = useState<HostAppContextValue | null>(null);

  useEffect(() => {
    let cancelled = false;
    void connectToHostApp().then(async ({ api, initialState }) => {
      const project = await readProject(api);
      if (!cancelled) setHost({ api, initialState, project });
    });
    return () => {
      cancelled = true;
    };
  }, [connectToHostApp]);

  const content = useMemo(
    () =>
      host === null ? (
        // Route state is seeded once from initialState, so nothing below may mount before it arrives.
        loadingFallback
      ) : (
        <HostAppContext.Provider value={host}>
          <RecentlyViewedProvider>
            <AppStateProvider>
              <main className="min-h-screen bg-muted/50 text-foreground">
                <AppRouter />
              </main>
            </AppStateProvider>
          </RecentlyViewedProvider>
        </HostAppContext.Provider>
      ),
    [host]
  );

  return (
    <AppErrorBoundary deps={errorBoundaryDeps}>
      <CogniteSdkProvider deps={deps} errorFallback={errorFallback} loadingFallback={loadingFallback}>
        {content}
      </CogniteSdkProvider>
    </AppErrorBoundary>
  );
}

export default App;
