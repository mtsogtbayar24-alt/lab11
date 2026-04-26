export interface RetryContext {
  attempt: number;
}

export type RetryableOperation<T> = (context: RetryContext) => Promise<T>;

export interface RetryPolicy {
  /**
   * Executes the provided asynchronous operation according to the policy.
   *
   * Preconditions:
   * - `operation` must be a function that returns a promise.
   *
   * Postconditions:
   * - Resolves with the operation result when one attempt succeeds.
   * - Rejects with a library exception when all attempts fail.
   *
   * Error conditions:
   * - Throws `RetryOperationFailedError` after the policy exhausts all attempts.
   */
  execute<T>(operation: RetryableOperation<T>): Promise<T>;

  /**
   * Returns a stable machine-readable name for the policy.
   *
   * Preconditions:
   * - None.
   *
   * Postconditions:
   * - Returns one of the supported policy names.
   */
  readonly kind: string;
}
