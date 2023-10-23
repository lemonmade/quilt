import {describe, it, expect} from 'vitest';
import {enhanceUrl, resolveUrl} from '../utilities.ts';

describe('utilities', () => {
  describe('resolveUrl()', () => {
    it('resolves to the relative root path', () => {
      const resolvedUrl = resolveUrl(
        '/',
        enhanceUrl(new URL('http://example.com/prefix/a'), '/prefix'),
      );

      expect(resolvedUrl.pathname).toBe('/prefix');
    });

    it('uses the origin prefix when no relativeTo is passed', () => {
      const resolvedUrl = resolveUrl(
        '/b',
        enhanceUrl(new URL('http://example.com/prefix/a'), '/prefix'),
      );

      expect(resolvedUrl.pathname).toBe('/prefix/b');
    });

    it('uses root when relativeTo is root', () => {
      const resolvedUrl = resolveUrl(
        '/b',
        enhanceUrl(new URL('http://example.com/prefix/a'), '/prefix'),
        'root',
      );

      expect(resolvedUrl.pathname).toBe('/b');
    });

    it('uses the current prefix when relativeTo is prefix', () => {
      const resolvedUrl = resolveUrl(
        '/b',
        enhanceUrl(new URL('http://example.com/1/2/a'), '/1/2'),
        'prefix',
      );

      expect(resolvedUrl.pathname).toBe('/1/2/b');
    });
  });
});
