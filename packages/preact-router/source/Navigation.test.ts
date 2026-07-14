// @vitest-environment jsdom

import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';

import {Navigation} from './Navigation.ts';

const SCROLL_STORAGE_KEY = 'quilt:navigation:scroll-positions';

describe('Navigation scroll restoration', () => {
  // Navigation instances share the global `window` and never detach their
  // listeners, so a stray `popstate`/`scroll` handler from one test would
  // fire in the next. Track what each instance attaches and remove it after.
  const addedListeners: [string, EventListenerOrEventListenerObject][] = [];
  let originalAddEventListener: typeof window.addEventListener;

  const scrollOffset = {x: 0, y: 0};
  let scrollTo: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    originalAddEventListener = window.addEventListener;
    window.addEventListener = function (
      this: Window,
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ) {
      addedListeners.push([type, listener]);
      return originalAddEventListener.call(this, type, listener, options);
    } as typeof window.addEventListener;

    scrollOffset.x = 0;
    scrollOffset.y = 0;
    Object.defineProperty(window, 'scrollX', {
      configurable: true,
      get: () => scrollOffset.x,
    });
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      get: () => scrollOffset.y,
    });

    // jsdom has no real `scrollTo`; stub it so we can assert and stay quiet.
    scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);
    // Run the deferred (next-frame) restore synchronously.
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {});

    history.scrollRestoration = 'auto';
    history.replaceState(null, '', '/');
    sessionStorage.clear();
  });

  afterEach(() => {
    for (const [type, listener] of addedListeners) {
      window.removeEventListener(type, listener);
    }
    addedListeners.length = 0;
    window.addEventListener = originalAddEventListener;
    delete (window as any).scrollX;
    delete (window as any).scrollY;
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it('switches the browser to manual scroll restoration by default', () => {
    void new Navigation('https://example.com/');

    expect(history.scrollRestoration).toBe('manual');
  });

  it('leaves scrolling to the browser when disabled', () => {
    const navigation = new Navigation('https://example.com/', {
      scrollRestoration: false,
    });

    navigation.navigate('/next');

    expect(history.scrollRestoration).toBe('auto');
    expect(scrollTo).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(SCROLL_STORAGE_KEY)).toBeNull();
  });

  it('resets to the top on a push navigation', () => {
    const navigation = new Navigation('https://example.com/');
    scrollOffset.y = 420;

    navigation.navigate('/next');

    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('resets to the top on a replace navigation', () => {
    const navigation = new Navigation('https://example.com/');
    scrollOffset.y = 420;

    navigation.navigate('/next', {replace: true});

    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('keeps the scroll position when navigating with `scroll: false`', () => {
    const navigation = new Navigation('https://example.com/');
    scrollOffset.y = 420;

    navigation.navigate('/next', {scroll: false});

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('keeps the scroll position when replacing with `scroll: false`', () => {
    const navigation = new Navigation('https://example.com/');
    scrollOffset.y = 420;

    navigation.navigate('/next', {replace: true, scroll: false});

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('records the kept position against the new entry when navigating with `scroll: false`', () => {
    const navigation = new Navigation('https://example.com/');
    scrollOffset.y = 420;

    const request = navigation.navigate('/next', {scroll: false});

    const stored = sessionStorage.getItem(SCROLL_STORAGE_KEY);
    expect(stored).not.toBeNull();

    const entries = new Map<string, [number, number]>(JSON.parse(stored!));
    expect(entries.get(request.id)).toEqual([0, 420]);
  });

  it('scrolls to the hash target on a forward navigation', () => {
    const scrollIntoView = vi.fn();
    const target = document.createElement('div');
    target.id = 'section';
    target.scrollIntoView = scrollIntoView;
    document.body.append(target);

    try {
      const navigation = new Navigation('https://example.com/');
      scrollOffset.y = 420;

      navigation.navigate('/next#section');

      expect(scrollIntoView).toHaveBeenCalled();
      expect(scrollTo).not.toHaveBeenCalled();
    } finally {
      target.remove();
    }
  });

  it('restores the saved offset when navigating back', () => {
    const navigation = new Navigation('https://example.com/');
    const initialId = navigation.currentRequest.id;

    // User scrolls down the page, then navigates forward.
    scrollOffset.y = 420;
    navigation.navigate('/next');
    scrollTo.mockClear();

    // The browser pops back to the initial entry, carrying its id in state.
    history.replaceState({_id: initialId}, '', '/');
    window.dispatchEvent(
      new PopStateEvent('popstate', {state: {_id: initialId}}),
    );

    expect(scrollTo).toHaveBeenCalledWith(0, 420);
  });

  it('persists scroll positions to sessionStorage keyed by navigation id', () => {
    const navigation = new Navigation('https://example.com/');
    const initialId = navigation.currentRequest.id;
    scrollOffset.y = 420;

    navigation.navigate('/next');

    const stored = sessionStorage.getItem(SCROLL_STORAGE_KEY);
    expect(stored).not.toBeNull();

    const entries = new Map<string, [number, number]>(JSON.parse(stored!));
    expect(entries.get(initialId)).toEqual([0, 420]);
  });
});
