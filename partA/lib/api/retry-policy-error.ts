export class RetryPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RetryPolicyError';
  }
}

export class RetryOperationFailedError extends RetryPolicyError {
  public readonly attempts: number;

  constructor(message: string, attempts: number, cause?: unknown) {
    super(message);
    this.name = 'RetryOperationFailedError';
    this.attempts = attempts;
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}
