import { InternalBaseRetryPolicy } from './internal-base-retry-policy';

export class ExponentialBackoffRetryPolicy extends InternalBaseRetryPolicy {
  public readonly kind = 'exponential-backoff';

  constructor(
    maxAttempts: number,
    private readonly baseDelayMs: number,
    private readonly maxDelayMs: number
  ) {
    super(maxAttempts);
  }

  protected nextDelayMs(attempt: number): number {
    return Math.min(this.maxDelayMs, this.baseDelayMs * 2 ** (attempt - 1));
  }
}
