// @vitest-environment jsdom

import {EventEmitter as NodeEventEmitter} from 'node:events';
import {expect, it, describe} from 'vitest';

import {EventEmitter} from '../emitter.ts';
import {AbortError} from '../abort.ts';

describe('EventEmitter', () => {
  describe('on()', () => {
    it('returns an async generator for each event', async () => {
      const events = new EventEmitter<{message: string}>();

      async function run() {
        const results: string[] = [];

        for await (const message of events.on('message')) {
          results.push(message);
          if (message === 'world!') break;
        }

        return results.join(' ');
      }

      const promise = run();

      events.emit('message', 'Hello');
      events.emit('message', 'world!');

      await expect(promise).resolves.toBe('Hello world!');
    });

    it('returns an async generator that breaks when a passed abort signal is aborted', async () => {
      const events = new EventEmitter<{message: string}>();
      const abort = new AbortController();

      async function run() {
        const results: string[] = [];

        for await (const message of events.on('message', {
          signal: abort.signal,
        })) {
          results.push(message);
          if (message === 'world!') break;
        }

        return results.join(' ');
      }

      const promise = run();

      events.emit('message', 'Hello');
      abort.abort();
      events.emit('message', 'world!');

      await expect(promise).resolves.toBe('Hello');
    });

    it('returns an async generator that throws with an AbortError if an abort signal is passed that aborts before the event, and `abort` is set to reject', async () => {
      const events = new EventEmitter<{message: string}>();
      const abort = new AbortController();

      async function run() {
        for await (const _ of events.on('message', {
          signal: abort.signal,
          abort: 'reject',
        })) {
          // noop
        }
      }

      const promise = run();

      events.emit('message', 'Hello');
      abort.abort();
      events.emit('message', 'world!');

      await expect(promise).rejects.toBeInstanceOf(AbortError);
    });
  });

  describe('once()', () => {
    it('returns a promise for the data of the next event', async () => {
      const events = new EventEmitter<{message: string}>();
      const promise = events.once('message');

      const result = 'Hello world!';
      events.emit('message', result);

      await expect(promise).resolves.toBe(result);
    });

    it('returns a promise that resolves with undefined if an abort signal is passed that aborts before the event', async () => {
      const events = new EventEmitter<{message: string}>();

      const abort = new AbortController();
      const promise = events.once('message', {signal: abort.signal});

      abort.abort();
      events.emit('message', 'Hello world!');

      await expect(promise).resolves.toBe(undefined);
    });

    it('returns a promise that rejects with an AbortError if an abort signal is passed that aborts before the event, and `abort` is set to reject', async () => {
      const events = new EventEmitter<{message: string}>();

      const abort = new AbortController();
      const promise = events.once('message', {
        signal: abort.signal,
        abort: 'reject',
      });

      abort.abort();
      events.emit('message', 'Hello world!');

      await expect(promise).rejects.toBeInstanceOf(AbortError);
    });
  });

  it('can wrap an `EventTarget`', async () => {
    const target = new EventTarget();
    const events = new EventEmitter<{message: Event}>(target);

    const promise = events.once('message');

    const event = new CustomEvent('message', {detail: 'Hello world!'});
    target.dispatchEvent(event);

    await expect(promise).resolves.toBe(event);
  });

  it('can wrap a Node.js `EventEmitter`', async () => {
    const target = new NodeEventEmitter();
    const events = new EventEmitter<{message: string}>(target);

    const promise = events.once('message');

    const result = 'Hello world!';
    target.emit('message', result);

    await expect(promise).resolves.toBe(result);
  });
});
