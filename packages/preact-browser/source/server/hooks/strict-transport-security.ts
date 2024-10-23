import {
  strictTransportSecurityHeader,
  type StrictTransportSecurityOptions,
} from '@quilted/browser/server';
import {useBrowserResponseAction} from './browser-response-action.ts';

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
  if (typeof document === 'object') return;

  useBrowserResponseAction((response) => {
    let normalizedValue = '';

    if (typeof value === 'string') {
      normalizedValue = value;
    } else {
      normalizedValue = strictTransportSecurityHeader(value);
    }

    if (normalizedValue.length > 0) {
      response.headers.append('Strict-Transport-Security', normalizedValue);
    }
  });
}
