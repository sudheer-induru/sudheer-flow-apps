import { Alert, AlertActions, AlertButton, AlertDescription, AlertTitle } from '@cognite/aura/components/alert';

type AppErrorFallbackProps = {
  error: unknown;
  onReload: () => void;
};

function messageOf(error: unknown): string | undefined {
  if (error instanceof Error) return error.message;
  return typeof error === 'string' ? error : undefined;
}

/**
 * A reload rebuilds the app from the URL the host holds, so the user keeps the
 * deep-linked asset. Retrying the same tree in place would usually fail again.
 */
export function AppErrorFallback({ error, onReload }: AppErrorFallbackProps) {
  const message = messageOf(error);

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/50 p-6 text-foreground">
      <Alert alertStyle="card" className="max-w-lg" role="alert" variant="error">
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription>
          <p>Asset 360 hit an unexpected problem while drawing this screen. Reloading usually clears it.</p>
          <p className="pt-2">Nothing in CDF was changed.</p>
          {message !== undefined && message !== '' && (
            <p className="break-words pt-2 font-mono text-sm text-muted-foreground">{message}</p>
          )}
        </AlertDescription>
        <AlertActions>
          <AlertButton onClick={onReload} type="button">
            Reload
          </AlertButton>
        </AlertActions>
      </Alert>
    </main>
  );
}
