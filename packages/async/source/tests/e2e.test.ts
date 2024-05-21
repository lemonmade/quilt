import {describe, it, expect, vi} from 'vitest';

import {AsyncFetchCache} from '../AsyncFetchCache.ts';

describe('AsyncFetchCache', () => {
  describe('get()', () => {
    it('returns a wrapper around an async function', async () => {
      const cache = new AsyncFetchCache();
      const greet = cache.get(async (name: string) => `Hello ${name}!`, {
        key: ['greet'],
      });

      expect(greet).toHaveProperty('key', ['greet']);
      expect(greet).toHaveProperty('id', expect.stringContaining('greet'));

      const result = await greet.fetch('Winston');
      expect(result).toBe('Hello Winston!');
    });

    it('returns the same entry for a given key', async () => {
      const cache = new AsyncFetchCache();
      const entry1 = cache.get(async () => '', {key: 'key'});
      const entry2 = cache.get(async () => '', {key: 'key'});

      expect(entry1).toBe(entry2);
    });

    it('returns different entries for different keys', async () => {
      const cache = new AsyncFetchCache();
      const entry1 = cache.get(async () => '', {key: 'key1'});
      const entry2 = cache.get(async () => '', {key: 'key2'});

      expect(entry1).not.toBe(entry2);
    });

    it('passes through an abort signal to the fetch function', async () => {
      const cache = new AsyncFetchCache();
      const abortController = new AbortController();
      const spy = vi.fn();
      const reason = new Error('Abort');

      const waitUntilAbort = cache.get(async (_, {signal}) => {
        signal.addEventListener('abort', () => {
          spy(signal.reason);
        });
      });

      const promise = waitUntilAbort.fetch(undefined, {
        signal: abortController.signal,
      });

      abortController.abort(reason);

      await expect(promise).rejects.toThrow(reason);
      expect(spy).toHaveBeenCalledWith(reason);
    });

    it('provides an abort() method to manually abort the fetch function', async () => {
      const cache = new AsyncFetchCache();
      const spy = vi.fn();
      const reason = new Error('Abort');

      const waitUntilAbort = cache.get(async (_, {signal}) => {
        signal.addEventListener('abort', () => {
          spy(signal.reason);
        });
      });

      const promise = waitUntilAbort.fetch();

      promise.source.abort(reason);

      await expect(promise).rejects.toThrow(reason);
      expect(spy).toHaveBeenCalledWith(reason);
    });
  });

  describe('fetch()', () => {
    it('calls an async function and puts it in the cache', async () => {
      const cache = new AsyncFetchCache();

      const getGreeting = async (name: string) => `Hello ${name}!`;
      const result = await cache.fetch(getGreeting, {
        key: ['greet'],
        input: 'Winston',
      });

      expect(result).toBe('Hello Winston!');

      const entry = cache.get(getGreeting, {key: ['greet']});

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
