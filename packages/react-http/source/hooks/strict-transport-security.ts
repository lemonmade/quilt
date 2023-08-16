import {useHttpAction} from './http-action.ts';

/**
 * Options for creating a content security policy.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy
 */
export interface StrictTransportSecurityOptions {
  /**
   * The time, in seconds, that the browser should remember that a site is only to
   * be accessed using HTTPS.
   *
   * @default 63_072_000
   */
  maxAge?: number;

  /**
   * Applies this rule to all of the site’s subdomains.
   *
   * @default true
   */
  includeSubDomains?: boolean;

  /**
   * Allows this site to be added to an HSTS preload service,
   * which browsers can use to determine ahead of time what sites
   * should default to being accessed via HTTPS.
   *
   * @default true
   */
  preload?: boolean;
}

// The recommendation for being added to Google’s preload list is
// two years. See https://hstspreload.org/ for details.
const DEFAULT_MAX_AGE = 63_072_000;

/**
 * Sets the `Strict-Transport-Security` header for this request. When no
 * value is passed, this component uses the recommended value from https://hstspreload.org/,
 * which prefers HTTPS for two years, includes all subdomains, and allows
 * the domain to be placed on HTTPS preload lists. If you pass a string,
 * it will be used directly as the header value. Otherwise, the first argument
 * must be an options object that specifies any of the `maxAge`, `includeSubDomains`,
 * and/or `preload` options for the rule.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security
 */
export function useStrictTransportSecurity(
  value: string | StrictTransportSecurityOptions = {},
) {
  useHttpAction((http) => {
    let normalizedValue = '';

    if (typeof value === 'string') {
      normalizedValue = value;
    } else {
      const {
        maxAge = DEFAULT_MAX_AGE,
        includeSubDomains = true,
        preload = true,
      } = value;

      normalizedValue = String(maxAge);

      if (includeSubDomains) normalizedValue += `; includeSubDomains`;
      if (preload) normalizedValue += `; preload`;
    }

    if (normalizedValue.length > 0) {
      http.responseHeaders.append('Strict-Transport-Security', normalizedValue);
    }
  });
}
