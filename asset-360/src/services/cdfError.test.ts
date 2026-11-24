import { CogniteError, HttpError } from '@cognite/sdk';
import { describe, expect, it } from 'vitest';

import { CdfServiceError, classifyStatus, errorKindOf, toCdfServiceError } from './cdfError';

describe(classifyStatus.name, () => {
  it.each([
    [401, 'no-access'],
    [403, 'no-access'],
    [408, 'transient'],
    [429, 'transient'],
    [500, 'transient'],
    [503, 'transient'],
    [400, 'unknown'],
    [404, 'unknown'],
    [undefined, 'unknown'],
  ] as const)('classifies %s as %s', (status, kind) => {
    expect(classifyStatus(status)).toBe(kind);
  });
});

describe(toCdfServiceError.name, () => {
  it('returns an existing service error unchanged', () => {
    const error = new CdfServiceError('boom', { kind: 'transient' });

    expect(toCdfServiceError(error)).toBe(error);
  });

  it('maps a CogniteError with its status and request id', () => {
    const error = new CogniteError('Forbidden', 403, 'req-1');

    const mapped = toCdfServiceError(error);

    expect(mapped).toMatchObject({ kind: 'no-access', status: 403, requestId: 'req-1', message: 'Forbidden' });
    expect(mapped.cause).toBe(error);
  });

  it('maps an HttpError by status', () => {
    const error = new HttpError(503, { error: { code: 503, message: 'Unavailable' } }, {});

    expect(toCdfServiceError(error)).toMatchObject({ kind: 'transient', status: 503 });
  });

  it('maps a plain error to unknown', () => {
    expect(toCdfServiceError(new Error('network down'))).toMatchObject({ kind: 'unknown', message: 'network down' });
  });

  it('maps a non-error value to unknown', () => {
    expect(toCdfServiceError('oops')).toMatchObject({ kind: 'unknown', message: 'oops' });
  });
});

describe(errorKindOf.name, () => {
  it('returns undefined when there is no error', () => {
    expect(errorKindOf(null)).toBeUndefined();
    expect(errorKindOf(undefined)).toBeUndefined();
  });

  it('returns the kind of an error', () => {
    expect(errorKindOf(new CogniteError('Unauthorized', 401))).toBe('no-access');
  });
});
