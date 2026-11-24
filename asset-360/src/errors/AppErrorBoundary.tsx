import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';

import { AppErrorFallback } from './AppErrorFallback';

/** Side effects injected so tests never touch browser globals (AGENTS.md §3). */
export type AppErrorBoundaryDeps = {
  reload: () => void;
  logError: (error: unknown, info: ErrorInfo) => void;
};

const DEFAULT_DEPS: AppErrorBoundaryDeps = {
  reload: () => window.location.reload(),
  logError: (error, info) => console.error('Unhandled application error:', error, info.componentStack),
};

type AppErrorBoundaryProps = {
  children: ReactNode;
  deps?: Partial<AppErrorBoundaryDeps>;
};

type AppErrorBoundaryState = {
  error: unknown;
  hasError: boolean;
};

/** Last-resort boundary (SPEC FR-021); panel failures are handled by each panel. */
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  override state: AppErrorBoundaryState = { error: undefined, hasError: false };

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return { error, hasError: true };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    (this.props.deps?.logError ?? DEFAULT_DEPS.logError)(error, info);
  }

  override render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    return <AppErrorFallback error={this.state.error} onReload={this.props.deps?.reload ?? DEFAULT_DEPS.reload} />;
  }
}
