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
});
