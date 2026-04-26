import { createRetryPolicy } from '../lib/api';
import { RetryOperationFailedError } from '../lib/api/retry-policy-error';
import { ExponentialBackoffRetryPolicy } from '../lib/impl/exponential-backoff-retry-policy';
import { FullJitterRetryPolicy } from '../lib/impl/full-jitter-retry-policy';

describe('retry policy factory', () => {
  test('creates a no-retry policy', () => {
    expect(createRetryPolicy({ kind: 'no-retry' }).kind).toBe('no-retry');
  });

  test('creates an exponential-backoff policy', () => {
    expect(createRetryPolicy({ kind: 'exponential-backoff' }).kind).toBe('exponential-backoff');
  });

  test('creates a full-jitter policy', () => {
    expect(createRetryPolicy({ kind: 'full-jitter' }).kind).toBe('full-jitter');
  });
});

describe('no retry policy', () => {
  test('executes once on success', async () => {
    const policy = createRetryPolicy({ kind: 'no-retry' });
    await expect(policy.execute(async () => 'ok')).resolves.toBe('ok');
  });

  test('fails after one attempt', async () => {
    const policy = createRetryPolicy({ kind: 'no-retry' });
    await expect(policy.execute(async () => {
      throw new Error('boom');
    })).rejects.toBeInstanceOf(RetryOperationFailedError);
  });
});

describe('exponential backoff policy', () => {
  test('retries until success', async () => {
    const policy = createRetryPolicy({ kind: 'exponential-backoff', maxAttempts: 3, baseDelayMs: 0, maxDelayMs: 0 });
    let attempts = 0;
    const result = await policy.execute(async () => {
      attempts += 1;
      if (attempts < 3) {
        throw new Error('retry');
      }
      return 'done';
    });
    expect(result).toBe('done');
    expect(attempts).toBe(3);
  });

  test('throws after max attempts', async () => {
    const policy = createRetryPolicy({ kind: 'exponential-backoff', maxAttempts: 2, baseDelayMs: 0, maxDelayMs: 0 });
    await expect(policy.execute(async () => {
      throw new Error('always');
    })).rejects.toMatchObject({ attempts: 2 });
  });

  test('uses capped backoff delay', () => {
    const policy = new ExponentialBackoffRetryPolicy(3, 10, 15) as unknown as { nextDelayMs: (attempt: number) => number };
    expect(policy.nextDelayMs(1)).toBe(10);
    expect(policy.nextDelayMs(2)).toBe(15);
    expect(policy.nextDelayMs(3)).toBe(15);
  });

  test('passes attempt number to operation', async () => {
    const policy = createRetryPolicy({ kind: 'exponential-backoff', maxAttempts: 1, baseDelayMs: 0, maxDelayMs: 0 });
    const attempts: number[] = [];
    await policy.execute(async (context) => {
      attempts.push(context.attempt);
      return 'ok';
    });
    expect(attempts).toEqual([1]);
  });

  test('succeeds on first attempt without extra retries', async () => {
    const policy = createRetryPolicy({ kind: 'exponential-backoff', maxAttempts: 4, baseDelayMs: 0, maxDelayMs: 0 });
    let attempts = 0;
    await policy.execute(async () => {
      attempts += 1;
      return 'ok';
    });
    expect(attempts).toBe(1);
  });
});

describe('full jitter policy', () => {
  test('retries until success', async () => {
    const policy = createRetryPolicy({ kind: 'full-jitter', maxAttempts: 3, baseDelayMs: 0, maxDelayMs: 0 });
    let attempts = 0;
    const result = await policy.execute(async () => {
      attempts += 1;
      if (attempts < 2) {
        throw new Error('retry');
      }
      return 'ok';
    });
    expect(result).toBe('ok');
    expect(attempts).toBe(2);
  });

  test('throws after max attempts', async () => {
    const policy = createRetryPolicy({ kind: 'full-jitter', maxAttempts: 2, baseDelayMs: 0, maxDelayMs: 0 });
    await expect(policy.execute(async () => {
      throw new Error('always');
    })).rejects.toMatchObject({ attempts: 2 });
  });

  test('computes jitter within cap', () => {
    const policy = new FullJitterRetryPolicy(3, 10, 100, () => 0.5) as unknown as { nextDelayMs: (attempt: number) => number };
    expect(policy.nextDelayMs(1)).toBe(5);
    expect(policy.nextDelayMs(2)).toBe(10);
  });

  test('caps jitter delay at max delay', () => {
    const policy = new FullJitterRetryPolicy(3, 100, 40, () => 0.75) as unknown as { nextDelayMs: (attempt: number) => number };
    expect(policy.nextDelayMs(3)).toBe(30);
  });

  test('supports deterministic zero delay', () => {
    const policy = new FullJitterRetryPolicy(3, 100, 100, () => 0) as unknown as { nextDelayMs: (attempt: number) => number };
    expect(policy.nextDelayMs(2)).toBe(0);
  });

  test('reports correct policy kind', () => {
    expect(createRetryPolicy({ kind: 'full-jitter' }).kind).toBe('full-jitter');
  });
});

describe('shared failure contract', () => {
  test('preserves final failure attempt count for no-retry', async () => {
    const policy = createRetryPolicy({ kind: 'no-retry' });
    await expect(policy.execute(async () => {
      throw new Error('x');
    })).rejects.toMatchObject({ attempts: 1 });
  });

  test('preserves final failure attempt count for exponential-backoff', async () => {
    const policy = createRetryPolicy({ kind: 'exponential-backoff', maxAttempts: 4, baseDelayMs: 0, maxDelayMs: 0 });
    await expect(policy.execute(async () => {
      throw new Error('x');
    })).rejects.toMatchObject({ attempts: 4 });
  });

  test('preserves final failure attempt count for full-jitter', async () => {
    const policy = createRetryPolicy({ kind: 'full-jitter', maxAttempts: 5, baseDelayMs: 0, maxDelayMs: 0 });
    await expect(policy.execute(async () => {
      throw new Error('x');
    })).rejects.toMatchObject({ attempts: 5 });
  });
});
