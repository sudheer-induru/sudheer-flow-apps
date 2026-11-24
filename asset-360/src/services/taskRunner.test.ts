import { describe, expect, it } from 'vitest';

import { QueuedTaskRunner } from './taskRunner';

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason: unknown) => void = () => undefined;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe(QueuedTaskRunner.name, () => {
  it('rejects a non-positive cap', () => {
    expect(() => new QueuedTaskRunner(0)).toThrow(RangeError);
    expect(() => new QueuedTaskRunner(1.5)).toThrow(RangeError);
  });

  it('runs at most the cap at once and starts queued tasks as others finish', async () => {
    const runner = new QueuedTaskRunner(2);
    const tasks = [deferred<number>(), deferred<number>(), deferred<number>()];
    const started: number[] = [];

    const results = tasks.map((task, index) =>
      runner.schedule(() => {
        started.push(index);
        return task.promise;
      })
    );

    expect(started).toEqual([0, 1]);
    expect(runner.active).toBe(2);
    expect(runner.pending).toBe(1);

    tasks[0]?.resolve(10);
    await results[0];
    await Promise.resolve();
    expect(started).toEqual([0, 1, 2]);

    tasks[1]?.resolve(11);
    tasks[2]?.resolve(12);
    await expect(Promise.all(results)).resolves.toEqual([10, 11, 12]);
    expect(runner.active).toBe(0);
  });

  it('propagates failures and keeps draining the queue', async () => {
    const runner = new QueuedTaskRunner(1);
    const failing = runner.schedule(() => Promise.reject(new Error('429')));
    const next = runner.schedule(() => Promise.resolve('ok'));

    await expect(failing).rejects.toThrow('429');
    await expect(next).resolves.toBe('ok');
  });
});
