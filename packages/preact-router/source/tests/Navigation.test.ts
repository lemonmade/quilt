// @vitest-environment jsdom

import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';

import {Navigation} from '../Navigation.ts';

// jsdom's window.location properties are non-configurable, so we need to
// replace the entire location object to spy on assign/replace.
function mockWindowLocation() {
  const original = window.location;

  const mock = {
    ...original,
    assign: vi.fn(),
    replace: vi.fn(),
    get href() {
      return original.href;
    },
    get origin() {
      return original.origin;
    },
    get pathname() {
      return original.pathname;
    },
    get search() {
      return original.search;
    },
    get hash() {
      return original.hash;
    },
  };

  Object.defineProperty(window, 'location', {
    value: mock,
    writable: true,
    configurable: true,
  });

  return {
    mock,
    restore() {
      Object.defineProperty(window, 'location', {
        value: original,
        writable: true,
        configurable: true,
      });
    },
  };
}

describe('Navigation', () => {
  describe('navigate()', () => {
    describe('cross-origin URLs', () => {
      let locationMock: ReturnType<typeof mockWindowLocation>;

      beforeEach(() => {
        locationMock = mockWindowLocation();
      });

      afterEach(() => {
        locationMock.restore();
      });

      it('uses window.location.assign for cross-origin navigation', () => {
        const navigation = new Navigation();

        navigation.navigate(new URL('https://other-origin.com/page'));

        expect(locationMock.mock.assign).toHaveBeenCalledWith(
          'https://other-origin.com/page',
        );
      });

      it('uses window.location.replace for cross-origin with replace option', () => {
        const navigation = new Navigation();

        navigation.navigate(new URL('https://other-origin.com/page'), {
          replace: true,
        });

        expect(locationMock.mock.replace).toHaveBeenCalledWith(
          'https://other-origin.com/page',
        );
      });

      it('uses window.location for same-origin URLs marked external by isExternal', () => {
        const navigation = new Navigation(undefined, {
          isExternal: () => true,
        });

        navigation.navigate('/some-page');

        expect(locationMock.mock.assign).toHaveBeenCalled();
      });

      it('does not use window.location for same-origin URLs without isExternal', () => {
        const navigation = new Navigation();

        navigation.navigate('/page');

        expect(locationMock.mock.assign).not.toHaveBeenCalled();
        expect(locationMock.mock.replace).not.toHaveBeenCalled();
      });
    });

    describe('same-origin navigation', () => {
      it('uses pushState for same-origin URLs', () => {
        const pushStateSpy = vi.spyOn(window.history, 'pushState');

        const navigation = new Navigation();
        navigation.navigate('/other');

        expect(pushStateSpy).toHaveBeenCalled();
        pushStateSpy.mockRestore();
      });

      it('uses replaceState when replace option is true', () => {
        const replaceStateSpy = vi.spyOn(window.history, 'replaceState');

        const navigation = new Navigation();
        navigation.navigate('/other', {replace: true});

        expect(replaceStateSpy).toHaveBeenCalled();
        replaceStateSpy.mockRestore();
      });

      it('updates the current request URL', () => {
        const navigation = new Navigation();

        navigation.navigate('/new-page');

        expect(navigation.currentRequest.url.pathname).toBe('/new-page');
      });
    });
  });

  describe('base', () => {
    it('accepts a static string base', () => {
      const navigation = new Navigation('/app/page', {base: '/app'});
      expect(navigation.base).toBe('/app');
    });

    it('accepts a URL base, using its pathname', () => {
      const navigation = new Navigation('/app/page', {
        base: new URL('https://example.com/app'),
      });
      expect(navigation.base).toBe('/app');
    });

    it('resolves a function base against the current URL', () => {
      const navigation = new Navigation('/@alice/page', {
        base: (url) => `/${url.pathname.split('/')[1]}`,
      });
      expect(navigation.base).toBe('/@alice');
    });

    it('re-evaluates a function base after navigation', () => {
      const navigation = new Navigation('/@alice/page', {
        base: (url) => `/${url.pathname.split('/')[1]}`,
      });
      expect(navigation.base).toBe('/@alice');

      // An absolute, same-origin URL crosses to a new scope (a base-relative
      // string would instead resolve under the current base).
      navigation.navigate(new URL('/@bob/other', window.location.origin));

      expect(navigation.currentRequest.url.pathname).toBe('/@bob/other');
      expect(navigation.base).toBe('/@bob');
    });
  });

  describe('scroll restoration', () => {
    const SCROLL_STORAGE_KEY = 'quilt:navigation:scroll-positions';

    // Navigation instances share the global `window`, and never detach their
    // listeners, so a stray `popstate`/`scroll` handler from one test would
    // fire in the next. Track every listener each instance attaches and
    // remove them after the test.
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

      scrollTo = vi.fn();
      vi.stubGlobal('scrollTo', scrollTo);
      // Run the deferred (next-frame) restore synchronously.
      vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
        cb(0);
        return 1;
      });
      vi.stubGlobal('cancelAnimationFrame', () => {});

      window.history.scrollRestoration = 'auto';
      window.history.replaceState(null, '', '/home');
      window.sessionStorage.clear();
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
      window.sessionStorage.clear();
    });

    it('switches the browser to manual scroll restoration by default', () => {
      new Navigation('https://example.com/home');

      expect(window.history.scrollRestoration).toBe('manual');
    });

    it('leaves scrolling to the browser when disabled', () => {
      const navigation = new Navigation('https://example.com/home', {
        scrollRestoration: false,
      });

      navigation.navigate('/next');

      expect(window.history.scrollRestoration).toBe('auto');
      expect(scrollTo).not.toHaveBeenCalled();
      expect(window.sessionStorage.getItem(SCROLL_STORAGE_KEY)).toBeNull();
    });

    it('resets to the top on a forward navigation', () => {
      const navigation = new Navigation('https://example.com/home');
      scrollOffset.y = 420;

      navigation.navigate('/next');

      expect(scrollTo).toHaveBeenCalledWith(0, 0);
    });

    it('restores the saved offset when navigating back', () => {
      const navigation = new Navigation('https://example.com/home');
      const homeId = navigation.currentRequest.id;

      // User scrolls down the home page, then navigates forward.
      scrollOffset.y = 420;
      navigation.navigate('/next');
      scrollTo.mockClear();

      // The browser pops back to the home entry, carrying its id in state.
      // (jsdom's document origin is localhost, so replaceState uses a path.)
      window.history.replaceState({_id: homeId}, '', '/home');
      window.dispatchEvent(
        new PopStateEvent('popstate', {state: {_id: homeId}}),
      );

      expect(scrollTo).toHaveBeenCalledWith(0, 420);
    });

    // A same-document fragment navigation — the user clicking `<a href="#x">`
    // — is a popstate we did not perform: the browser pushes the entry with a
    // null `history.state`, so there is no id on it to recognise. Falling back
    // to the first entry of the session adopted that entry wholesale, which
    // restored its scroll offset over the jump the browser had just made and
    // left `currentRequest` on the pre-fragment URL.
    describe('browser fragment navigations', () => {
      function fragmentNavigation(hash: string) {
        // What the browser does on the click: push the entry with no state of
        // ours on it, scroll to the target, then fire popstate.
        window.history.pushState(null, '', `/home${hash}`);
        window.dispatchEvent(new PopStateEvent('popstate', {state: null}));
      }

      function addTarget(id: string) {
        const target = document.createElement('div');
        target.id = id;
        document.body.append(target);
        const scrollIntoView = vi.fn();
        target.scrollIntoView = scrollIntoView;
        return {target, scrollIntoView};
      }

      afterEach(() => {
        document.body.innerHTML = '';
      });

      it('scrolls to the fragment target rather than restoring the entry it left', () => {
        new Navigation('https://example.com/home');
        const {scrollIntoView} = addTarget('section');

        fragmentNavigation('#section');

        expect(scrollIntoView).toHaveBeenCalled();
        // The reader was at the top when they clicked, so restoring the
        // outgoing entry's offset is what dropped them back there.
        expect(scrollTo).not.toHaveBeenCalledWith(0, 0);
      });

      it('reports the fragment URL as the current request', () => {
        const navigation = new Navigation('https://example.com/home');
        addTarget('section');

        fragmentNavigation('#section');

        expect(navigation.currentRequest.url.hash).toBe('#section');
      });

      it('stamps an id on the entry so traversing back to it is recognised', () => {
        const navigation = new Navigation('https://example.com/home');
        addTarget('section');

        fragmentNavigation('#section');

        expect(window.history.state).toMatchObject({
          _id: navigation.currentRequest.id,
        });
      });

      it('keeps the entry it left addressable by its own id', () => {
        const navigation = new Navigation('https://example.com/home');
        const homeId = navigation.currentRequest.id;
        addTarget('section');
        scrollOffset.y = 420;

        fragmentNavigation('#section');
        scrollTo.mockClear();

        // Back to the pre-fragment entry: its offset must still be its own,
        // not one the fragment entry overwrote.
        window.history.replaceState({_id: homeId}, '', '/home');
        window.dispatchEvent(
          new PopStateEvent('popstate', {state: {_id: homeId}}),
        );

        expect(navigation.currentRequest.id).toBe(homeId);
        expect(scrollTo).toHaveBeenCalledWith(0, 420);
      });
    });

    it('persists scroll positions to sessionStorage keyed by navigation id', () => {
      const navigation = new Navigation('https://example.com/home');
      const homeId = navigation.currentRequest.id;
      scrollOffset.y = 420;

      navigation.navigate('/next');

      const stored = window.sessionStorage.getItem(SCROLL_STORAGE_KEY);
      expect(stored).not.toBeNull();

      const entries = new Map<string, [number, number]>(JSON.parse(stored!));
      expect(entries.get(homeId)).toEqual([0, 420]);
    });
  });
});
