import { RetryPolicyError } from './retry-policy-error';
import { RetryPolicy } from './retry-policy';
import { ExponentialBackoffRetryPolicy } from '../impl/exponential-backoff-retry-policy';
import { FullJitterRetryPolicy } from '../impl/full-jitter-retry-policy';
import { NoRetryPolicy } from '../impl/no-retry-policy';

export type RetryPolicyKind = 'no-retry' | 'exponential-backoff' | 'full-jitter';

export interface RetryPolicyOptions {
  kind: RetryPolicyKind;
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

/**
 * Creates retry policies while hiding concrete implementations from library consumers.
 *
 * Preconditions:
 * - `options.kind` must be one of the supported values.
 *
 * Postconditions:
 * - Returns a policy implementing the shared `RetryPolicy` interface.
 *
 * Error conditions:
 * - Throws `RetryPolicyError` when the requested policy kind is unsupported.
 */
export function createRetryPolicy(options: RetryPolicyOptions): RetryPolicy {
  switch (options.kind) {
    case 'no-retry':
      return new NoRetryPolicy();
    case 'exponential-backoff':
      return new ExponentialBackoffRetryPolicy(options.maxAttempts ?? 3, options.baseDelayMs ?? 50, options.maxDelayMs ?? 1_000);
    case 'full-jitter':
      return new FullJitterRetryPolicy(options.maxAttempts ?? 3, options.baseDelayMs ?? 50, options.maxDelayMs ?? 1_000);
    default:
      throw new RetryPolicyError(`Unsupported retry policy kind: ${(options as RetryPolicyOptions).kind}`);
  }
}
