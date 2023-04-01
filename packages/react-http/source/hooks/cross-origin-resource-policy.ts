import {type CrossOriginResourcePolicyHeaderValue} from '@quilted/http';
import {useHttpAction} from './http-action.ts';

/**
 * Sets the `Cross-Origin-Resource-Policy` header for this request.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Resource-Policy
 * @see https://web.dev/security-headers/#corp
 */
export function useCrossOriginResourcePolicy(
  value: CrossOriginResourcePolicyHeaderValue,
) {
  useHttpAction((http) => {
    http.responseHeaders.append('Cross-Origin-Resource-Policy', value);
  });
}
