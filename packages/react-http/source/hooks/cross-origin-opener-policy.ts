import {type CrossOriginOpenerPolicyHeaderValue} from '@quilted/http';
import {useHttpAction} from './http-action.ts';

/**
 * Sets the `Cross-Origin-Opener-Policy` header for this request.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Opener-Policy
 * @see https://web.dev/security-headers/#coop
 */
export function useCrossOriginOpenerPolicy(
  value: CrossOriginOpenerPolicyHeaderValue,
) {
  useHttpAction((http) => {
    http.responseHeaders.append('Cross-Origin-Opener-Policy', value);
  });
}
