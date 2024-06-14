import {describe, it, expect, vi} from 'vitest';
import {effect} from '@quilted/signals';

import {AsyncAction} from '../AsyncAction.ts';
import {AsyncActionCache} from '../AsyncActionCache.ts';

describe('AsyncAction', () => {
  it('can yield values for pending actions', async () => {
    const sleep = (ms = 0) =>
      new Promise<void>((resolve) => setTimeout(resolve, ms));

    const action = new AsyncAction(async (_, {yield: yieldValue}) => {
      let buffer = '';

      buffer += 'Hello';
      yieldValue(buffer);
      await sleep();

      buffer += ' world';
      yieldValue(buffer);
      await sleep();

      buffer += '!';
      return buffer;
    });

    const spy = vi.fn();
    effect(() => {
      spy(action.value);
    });

    await action.run();

    expect(action.status).toBe('resolved');
    expect(action.value).toBe('Hello world!');

    expect(spy).toHaveBeenNthCalledWith(1, undefined);
    expect(spy).toHaveBeenNthCalledWith(2, 'Hello');
    expect(spy).toHaveBeenNthCalledWith(3, 'Hello world');
    expect(spy).toHaveBeenNthCalledWith(4, 'Hello world!');
  });
});

describe('AsyncActionCache', () => {
  const getGreeting = async (name: string) => `Hello ${name}!`;

  describe('create()', () => {
    it('returns a wrapper around an async function', async () => {
      const cache = new AsyncActionCache();
      const greet = cache.create(() => new AsyncAction(getGreeting), {
        key: ['greet'],
      });

      expect(greet).toHaveProperty('key', ['greet']);
      expect(greet).toHaveProperty('id', expect.stringContaining('greet'));

      const result = await greet.run('Winston');
      expect(result).toBe('Hello Winston!');
    });

    it('returns the same entry for a given key', async () => {
      const cache = new AsyncActionCache();
      const entry1 = cache.create(() => new AsyncAction(getGreeting), {
        key: 'key',
      });
      const entry2 = cache.create(() => new AsyncAction(getGreeting), {
        key: 'key',
      });

      expect(entry1).toBe(entry2);
    });

    it('returns different entries for different keys', async () => {
      const cache = new AsyncActionCache();
      const entry1 = cache.create(() => new AsyncAction(getGreeting), {
        key: 'key1',
      });
      const entry2 = cache.create(() => new AsyncAction(getGreeting), {
        key: 'key2',
      });

      expect(entry1).not.toBe(entry2);
    });

    it('passes through an abort signal to the async function', async () => {
      const cache = new AsyncActionCache();
      const abortController = new AbortController();
      const spy = vi.fn();
      const reason = new Error('Abort');

      const waitUntilAbort = cache.create(
        () =>
          new AsyncAction(async (_, {signal}) => {
            signal.addEventListener('abort', () => {
              spy(signal.reason);
            });
          }),
      );

      const promise = waitUntilAbort.run(undefined, {
        signal: abortController.signal,
      });

      abortController.abort(reason);

      await expect(promise).rejects.toThrow(reason);
      expect(spy).toHaveBeenCalledWith(reason);
    });

    it('provides an abort() method to manually abort the fetch function', async () => {
      const cache = new AsyncActionCache();
      const spy = vi.fn();
      const reason = new Error('Abort');

      const waitUntilAbort = cache.create(
        () =>
          new AsyncAction(async (_, {signal}) => {
            signal.addEventListener('abort', () => {
              spy(signal.reason);
            });
          }),
      );

      const promise = waitUntilAbort.run();

      promise.source.abort(reason);

      await expect(promise).rejects.toThrow(reason);
      expect(spy).toHaveBeenCalledWith(reason);
    });
  });

  describe('run()', () => {
    it('calls an async function and puts it in the cache', async () => {
      const cache = new AsyncActionCache();

      const result = await cache.run(getGreeting, {
        key: ['greet'],
        input: 'Winston',
      });

      expect(result).toBe('Hello Winston!');

      const entry = cache.get(['greet'])!;

      expect(entry).toMatchObject({
        status: 'resolved',
        value: 'Hello Winston!',
      });
      expect(entry.finished).toMatchObject({
        status: 'resolved',
        input: 'Winston',
        value: 'Hello Winston!',
      });
    });
  });
});
