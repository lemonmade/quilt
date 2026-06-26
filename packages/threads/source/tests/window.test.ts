import {describe, it, expect, vi, afterEach} from 'vitest';

import {windowToThreadTarget} from '../threads/ThreadWindow.ts';

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * Stubs the global `self` with a fake that captures the `message` listener, so
 * tests can synthesize inbound `MessageEvent`s, and exposes a configurable
 * `location.ancestorOrigins`.
 */
function stubSelf({
  ancestorOrigins,
}: {ancestorOrigins?: string[] | undefined} = {}) {
  let handler: ((event: any) => void) | undefined;

  vi.stubGlobal('self', {
    location: ancestorOrigins == null ? {} : {ancestorOrigins},
    addEventListener(type: string, listener: (event: any) => void) {
      if (type === 'message') handler = listener;
    },
  });

  return {
    dispatch(event: {source: unknown; origin: string; data: unknown}) {
      handler?.(event);
    },
  };
}

function fakeWindow() {
  return {postMessage: vi.fn()} as unknown as Window & {
    postMessage: ReturnType<typeof vi.fn>;
  };
}

describe('windowToThreadTarget', () => {
  it('posts to and accepts any origin by default', () => {
    const {dispatch} = stubSelf();
    const window = fakeWindow();
    const target = windowToThreadTarget(window);

    const received: unknown[] = [];
    target.listen((value) => received.push(value), {});

    target.send('out');
    expect(window.postMessage).toHaveBeenCalledWith('out', '*', undefined);

    dispatch({source: window, origin: 'https://anywhere.example', data: 'in'});
    expect(received).toEqual(['in']);
  });

  it('pins outbound and validates inbound against a concrete origin', () => {
    const origin = 'https://trusted.example';
    const {dispatch} = stubSelf();
    const window = fakeWindow();
    const target = windowToThreadTarget(window, {targetOrigin: origin});

    const received: unknown[] = [];
    target.listen((value) => received.push(value), {});

    target.send('out');
    expect(window.postMessage).toHaveBeenCalledWith('out', origin, undefined);

    dispatch({source: window, origin, data: 'trusted'});
    dispatch({source: window, origin: 'https://evil.example', data: 'spoofed'});

    expect(received).toEqual(['trusted']);
  });

  it('ignores messages whose source is not the target window', () => {
    const {dispatch} = stubSelf();
    const window = fakeWindow();
    const target = windowToThreadTarget(window);

    const received: unknown[] = [];
    target.listen((value) => received.push(value), {});

    dispatch({source: {}, origin: 'https://anywhere.example', data: 'other'});
    expect(received).toEqual([]);
  });

  it('pins to ancestorOrigins when targetOrigin is "ancestor"', () => {
    const framer = 'https://framer.example';
    const {dispatch} = stubSelf({ancestorOrigins: [framer]});
    const window = fakeWindow();
    const target = windowToThreadTarget(window, {targetOrigin: 'ancestor'});

    const received: unknown[] = [];
    target.listen((value) => received.push(value), {});

    target.send('out');
    expect(window.postMessage).toHaveBeenCalledWith('out', framer, undefined);

    dispatch({source: window, origin: framer, data: 'trusted'});
    dispatch({source: window, origin: 'https://evil.example', data: 'spoofed'});
    expect(received).toEqual(['trusted']);
  });

  it('buffers then pins to the first sender when ancestorOrigins is unavailable', () => {
    const framer = 'https://framer.example';
    // No `ancestorOrigins` (e.g. Firefox).
    const {dispatch} = stubSelf({ancestorOrigins: undefined});
    const window = fakeWindow();
    const target = windowToThreadTarget(window, {targetOrigin: 'ancestor'});

    const received: unknown[] = [];
    target.listen((value) => received.push(value), {});

    // Sent before the origin is known: must be buffered, not posted to '*'.
    target.send('early');
    expect(window.postMessage).not.toHaveBeenCalled();

    // First inbound message pins the origin and flushes the buffer.
    dispatch({source: window, origin: framer, data: 'first'});
    expect(window.postMessage).toHaveBeenCalledWith('early', framer, undefined);
    expect(received).toEqual(['first']);

    // Subsequent messages from other origins are rejected.
    dispatch({source: window, origin: 'https://evil.example', data: 'spoofed'});
    expect(received).toEqual(['first']);

    // Later outbound messages go straight to the pinned origin.
    target.send('later');
    expect(window.postMessage).toHaveBeenCalledWith('later', framer, undefined);
  });
});
