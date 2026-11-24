import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AppErrorBoundary } from './AppErrorBoundary';

function Broken(): never {
  throw new Error('render exploded');
}

describe(AppErrorBoundary.name, () => {
  it('renders children when nothing throws', () => {
    render(
      <AppErrorBoundary>
        <p>fine</p>
      </AppErrorBoundary>
    );

    expect(screen.getByText('fine')).toBeInTheDocument();
  });

  it('shows a recoverable screen, logs the error and reloads on request', async () => {
    const reload = vi.fn();
    const logError = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <AppErrorBoundary deps={{ reload, logError }}>
        <Broken />
      </AppErrorBoundary>
    );

    expect(screen.getByRole('alert')).toHaveTextContent('render exploded');
    expect(logError).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(reload).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });
});
