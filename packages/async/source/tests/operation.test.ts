import {describe, it, expect} from 'vitest';

import {runAsync} from '../operation.ts';

describe('AsyncOperation', () => {
  it('can wrap a promise', async () => {
    const operation = runAsync(() => Promise.resolve(1));

    const result = await operation.promise;

    expect(result).toBe(1);

    expect(operation.status.value).toBe('resolved');
    expect(operation.value.value).toBe(1);
    expect(operation.cause.value).toBe(undefined);
  });

  it('can wrap an async generator', async () => {
    const operation = runAsync(() =>
      (async function* () {
        yield 1;
        yield 2;
        yield 3;
      })(),
    );

    const results: number[] = [];

    operation.value.subscribe((value) => {
      results.push(value!);
    });

    const result = await operation.promise;

    expect(results).toStrictEqual([undefined, 1, 2, 3]);
    expect(result).toBe(3);

    expect(operation.status.value).toBe('resolved');
    expect(operation.value.value).toBe(3);
    expect(operation.cause.value).toBe(undefined);
  });

  it('can wrap an async generator that throws an error', async () => {
    const error = new Error('Async generator error');

    const operation = runAsync(() =>
      (async function* () {
        yield 1;
        throw error;
      })(),
    );

    const results: number[] = [];

    operation.value.subscribe((value) => {
      results.push(value!);
    });

    const result = await operation.promise;

    expect(result).toBeUndefined();
    expect(results).toStrictEqual([undefined, 1]);

    expect(operation.status.value).toBe('rejected');
    expect(operation.value.value).toBe(1);
    expect(operation.cause.value).toBe(error);
  });
});
