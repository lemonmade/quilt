import {describe, it, expect} from 'vitest';

import {resolveURL} from '../utilities.ts';

describe('resolveURL', () => {
  describe('string form', () => {
    it('resolves an absolute path against the base', () => {
      const result = resolveURL(
        '/activities/1',
        new URL('https://example.com/app/home'),
        '/app',
      );

      expect(result.pathname).toBe('/app/activities/1');
    });

    it('resolves an absolute path with no base', () => {
      const result = resolveURL(
        '/activities/1',
        new URL('https://example.com/home'),
      );

      expect(result.pathname).toBe('/activities/1');
    });

    it('preserves search params in the string', () => {
      const result = resolveURL(
        '/page?key=value',
        new URL('https://example.com/'),
      );

      expect(result.pathname).toBe('/page');
      expect(result.search).toBe('?key=value');
    });
  });

  describe('object form', () => {
    it('updates search while preserving the current pathname', () => {
      const result = resolveURL(
        {search: '?filter=true'},
        new URL('https://example.com/activities/1/schedule'),
      );

      expect(result.pathname).toBe('/activities/1/schedule');
      expect(result.search).toBe('?filter=true');
    });

    it('updates path with base prefix applied', () => {
      const result = resolveURL(
        {path: '/activities/1'},
        new URL('https://example.com/app/home'),
        '/app',
      );

      expect(result.pathname).toBe('/app/activities/1');
    });

    it('does not double-apply base when updating only search', () => {
      const from = new URL('https://example.com/app/activities/1/schedule');

      const result = resolveURL({search: '?filter=true'}, from, '/app');

      expect(result.pathname).toBe('/app/activities/1/schedule');
      expect(result.search).toBe('?filter=true');
    });

    it('does not double-apply base on repeated calls with only search', () => {
      const base = '/app';
      const from = new URL('https://example.com/app/activities/1/schedule');

      // Simulate what happens on a second navigate call: the "from" URL
      // already contains the base prefix from the first navigation.
      const first = resolveURL({search: '?a=1'}, from, base);
      const second = resolveURL({search: '?b=2'}, first, base);

      expect(first.pathname).toBe('/app/activities/1/schedule');
      expect(second.pathname).toBe('/app/activities/1/schedule');
      expect(second.search).toBe('?b=2');
    });

    it('clears search when passing an empty string', () => {
      const from = new URL('https://example.com/page?existing=param');

      const result = resolveURL({search: ''}, from);

      expect(result.pathname).toBe('/page');
      expect(result.search).toBe('');
    });

    it('updates both path and search together', () => {
      const result = resolveURL(
        {path: '/new-page', search: '?key=value'},
        new URL('https://example.com/old-page'),
      );

      expect(result.pathname).toBe('/new-page');
      expect(result.search).toBe('?key=value');
    });
  });

  describe('function form', () => {
    it('receives the current URL and resolves the returned value', () => {
      const result = resolveURL(
        (current) => `/other${current.search}`,
        new URL('https://example.com/page?key=value'),
      );

      expect(result.pathname).toBe('/other');
      expect(result.search).toBe('?key=value');
    });

    it('can return a URL object to bypass base prefixing', () => {
      const result = resolveURL(
        (current) => {
          const url = new URL(current.href);
          url.search = '?updated=true';

          return url;
        },
        new URL('https://example.com/app/page'),
        '/app',
      );

      expect(result.pathname).toBe('/app/page');
      expect(result.search).toBe('?updated=true');
    });
  });

  describe('URL form', () => {
    it('returns a copy of the URL without modification', () => {
      const input = new URL('https://other.com/page?key=value');
      const result = resolveURL(input, new URL('https://example.com/'));

      expect(result.href).toBe('https://other.com/page?key=value');
      expect(result).not.toBe(input);
    });
  });
});
