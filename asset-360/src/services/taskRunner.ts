/**
 * Caps how many CDF requests the app has in flight at once, so opening an asset
 * (header, series list, latest values, aggregates and work orders in parallel)
 * cannot exceed the DMS concurrency budget and trigger 429s.
 *
 * Throttling that still happens is retried by `@cognite/sdk`: its HTTP client
 * retries 429 responses for every method up to 5 times with exponential
 * backoff and jitter. Retries stop there; the panel then shows a transient
 * error with "Try again" (see `cdfError.ts`).
 */
export interface TaskScheduler {
  schedule<T>(task: () => Promise<T>): Promise<T>;
}

export const DEFAULT_MAX_CONCURRENT_TASKS = 6;

type QueuedTask = () => void;

export class QueuedTaskRunner implements TaskScheduler {
  private readonly queue: QueuedTask[] = [];
  private running = 0;

  constructor(private readonly maxConcurrent: number = DEFAULT_MAX_CONCURRENT_TASKS) {
    if (!Number.isInteger(maxConcurrent) || maxConcurrent < 1) {
      throw new RangeError('maxConcurrent must be a positive integer');
    }
  }

  get pending(): number {
    return this.queue.length;
  }

  get active(): number {
    return this.running;
  }

  schedule<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(() => {
        this.running += 1;
        task()
          .then(resolve, reject)
          .finally(() => {
            this.running -= 1;
            this.next();
          });
      });
      this.next();
    });
  }

  private next(): void {
    while (this.running < this.maxConcurrent) {
      const start = this.queue.shift();
      if (start === undefined) return;
      start();
    }
  }
}

/** Shared by every service so the cap applies across panels. */
export const cdfTaskRunner: TaskScheduler = new QueuedTaskRunner();
