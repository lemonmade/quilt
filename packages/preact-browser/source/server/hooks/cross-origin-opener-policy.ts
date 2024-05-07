import {type CrossOriginOpenerPolicyHeaderValue} from '@quilted/http';
import {useBrowserResponseAction} from './browser-response-action.ts';

/**
 * Sets the `Cross-Origin-Opener-Policy` header for this request.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Opener-Policy
 * @see https://web.dev/security-headers/#coop
 */
export function useCrossOriginOpenerPolicy(
  value: CrossOriginOpenerPolicyHeaderValue,
) {
  if (typeof document === 'object') return;

  useBrowserResponseAction((response) => {
    response.headers.append('Cross-Origin-Opener-Policy', value);
  });
}
