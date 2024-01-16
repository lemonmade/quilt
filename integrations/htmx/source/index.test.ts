import {describe, it, expect} from 'vitest';

import {HTMXResponse} from './index.ts';

describe('HTMXResponse', () => {
  it('sets the HTML content-type', () => {
    const response = new HTMXResponse();
    expect(response.headers.get('Content-Type')).toContain('text/html');
  });

  describe('headers', () => {
    it('sets the location header from a string', () => {
      const location = 'https://example.com/go-here';

      const response = new HTMXResponse(null, {
        htmx: {location},
      });

      expect(response.headers.get('HX-Location')).toBe(location);
    });

    it('sets the location header from a URL', () => {
      const location = 'https://example.com/go-here';

      const response = new HTMXResponse(null, {
        htmx: {location: new URL(location)},
      });

      expect(response.headers.get('HX-Location')).toBe(location);
    });

    it('sets the location header with additional context', () => {
      const path = '/go-here';
      const target = '.my-target';
      const swap = 'outerHTML';

      const response = new HTMXResponse(null, {
        htmx: {location: {path, target, swap}},
      });

      expect(response.headers.get('HX-Location')).toBe(
        JSON.stringify({path, target, swap}),
      );
    });

    it('sets the redirect header from a string', () => {
      const redirect = 'https://example.com/go-here';

      const response = new HTMXResponse(null, {
        htmx: {redirect},
      });

      expect(response.headers.get('HX-Redirect')).toBe(redirect);
    });

    it('sets the redirect header from a URL', () => {
      const redirect = 'https://example.com/go-here';

      const response = new HTMXResponse(null, {
        htmx: {redirect: new URL(redirect)},
      });

      expect(response.headers.get('HX-Redirect')).toBe(redirect);
    });

    it('sets the push-url header from a string', () => {
      const pushURL = 'https://example.com/go-here';

      const response = new HTMXResponse(null, {
        htmx: {pushURL},
      });

      expect(response.headers.get('HX-Push-Url')).toBe(pushURL);
    });

    it('sets the push-url header from a URL', () => {
      const pushURL = 'https://example.com/go-here';

      const response = new HTMXResponse(null, {
        htmx: {pushURL: new URL(pushURL)},
      });

      expect(response.headers.get('HX-Push-Url')).toBe(pushURL);
    });

    it('sets the push-url header to an explicit `false` value', () => {
      const response = new HTMXResponse(null, {
        htmx: {pushURL: false},
      });

      expect(response.headers.get('HX-Push-Url')).toBe('false');
    });

    it('sets the replace-url header from a string', () => {
      const replaceURL = 'https://example.com/go-here';

      const response = new HTMXResponse(null, {
        htmx: {replaceURL},
      });

      expect(response.headers.get('HX-Replace-Url')).toBe(replaceURL);
    });

    it('sets the replace-url header from a URL', () => {
      const replaceURL = 'https://example.com/go-here';

      const response = new HTMXResponse(null, {
        htmx: {replaceURL: new URL(replaceURL)},
      });

      expect(response.headers.get('HX-Replace-Url')).toBe(replaceURL);
    });

    it('sets the replace-url header to an explicit `false` value', () => {
      const response = new HTMXResponse(null, {
        htmx: {replaceURL: false},
      });

      expect(response.headers.get('HX-Replace-Url')).toBe('false');
    });
  });
});
