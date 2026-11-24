import { CogniteError, HttpError } from '@cognite/sdk';

/**
 * How a panel reacts to a failed read.
 *
 * - `no-access`: the user lacks a capability; retrying will not help.
 * - `transient`: timeout, throttling or server fault; a manual retry may help.
 * - `unknown`: anything else, including network failures with no HTTP status.
 */
export type ServiceErrorKind = 'no-access' | 'transient' | 'unknown';

type CdfServiceErrorDetails = {
  kind: ServiceErrorKind;
  status?: number;
  requestId?: string;
  cause?: unknown;
};

/** The only error type the service layer throws, so views never import SDK error classes. */
export class CdfServiceError extends Error {
  readonly kind: ServiceErrorKind;
  readonly status?: number;
  readonly requestId?: string;
  readonly cause: unknown;

  constructor(message: string, details: CdfServiceErrorDetails) {
    super(message);
    this.name = 'CdfServiceError';
    this.kind = details.kind;
    this.status = details.status;
    this.requestId = details.requestId;
    this.cause = details.cause;
  }
}

export function classifyStatus(status: number | undefined): ServiceErrorKind {
  if (status === undefined) return 'unknown';
  if (status === 401 || status === 403) return 'no-access';
  if (status === 408 || status === 429 || status >= 500) return 'transient';
  return 'unknown';
}

export function toCdfServiceError(error: unknown): CdfServiceError {
  if (error instanceof CdfServiceError) return error;

  if (error instanceof CogniteError) {
    return new CdfServiceError(error.errorMessage, {
      kind: classifyStatus(error.status),
      status: error.status,
      requestId: error.requestId,
      cause: error,
    });
  }

  if (error instanceof HttpError) {
    return new CdfServiceError(error.message, {
      kind: classifyStatus(error.status),
      status: error.status,
      cause: error,
    });
  }

  return new CdfServiceError(error instanceof Error ? error.message : String(error), {
    kind: 'unknown',
    cause: error,
  });
}

export function errorKindOf(error: unknown): ServiceErrorKind | undefined {
  if (error === null || error === undefined) return undefined;
  return toCdfServiceError(error).kind;
}
