import { RetryableOperation, RetryPolicy } from '../api/retry-policy';
import { RetryOperationFailedError } from '../api/retry-policy-error';

export class NoRetryPolicy implements RetryPolicy {
  public readonly kind = 'no-retry';

  public async execute<T>(operation: RetryableOperation<T>): Promise<T> {
    try {
      return await operation({ attempt: 1 });
    } catch (error) {
      throw new RetryOperationFailedError('Operation failed after 1 attempt(s)', 1, error);
    }
  }
}
