import { RetryableOperation, RetryPolicy } from '../api/retry-policy';
import { RetryOperationFailedError } from '../api/retry-policy-error';

export abstract class InternalBaseRetryPolicy implements RetryPolicy {
  public abstract readonly kind: string;

  protected constructor(private readonly maxAttempts: number) {}

  public async execute<T>(operation: RetryableOperation<T>): Promise<T> {
    let attempt = 0;
    let lastError: unknown;

    while (attempt < this.maxAttempts) {
      attempt += 1;
      try {
        return await operation({ attempt });
      } catch (error) {
        lastError = error;
        if (attempt >= this.maxAttempts) {
          throw new RetryOperationFailedError(`Operation failed after ${attempt} attempt(s)`, attempt, error);
        }
        await this.wait(this.nextDelayMs(attempt));
      }
    }

    throw new RetryOperationFailedError('Operation failed', attempt, lastError);
  }

  protected abstract nextDelayMs(attempt: number): number;

  protected wait(delayMs: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}
