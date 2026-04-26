import { InternalBaseRetryPolicy } from './internal-base-retry-policy';

export class FullJitterRetryPolicy extends InternalBaseRetryPolicy {
  public readonly kind = 'full-jitter';

  constructor(
    maxAttempts: number,
    private readonly baseDelayMs: number,
    private readonly maxDelayMs: number,
    private readonly random: () => number = Math.random
  ) {
    super(maxAttempts);
  }

  protected nextDelayMs(attempt: number): number {
    const cap = Math.min(this.maxDelayMs, this.baseDelayMs * 2 ** (attempt - 1));
    return Math.floor(this.random() * cap);
  }
}
