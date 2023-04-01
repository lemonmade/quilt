import {type CrossOriginEmbedderPolicyHeaderValue} from '@quilted/http';
import {useHttpAction} from './http-action.ts';

/**
 * Sets the `Cross-Origin-Embedder-Policy` header for this request.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Embedder-Policy
 * @see https://web.dev/security-headers/#coep
 */
export function useCrossOriginEmbedderPolicy(
  value: CrossOriginEmbedderPolicyHeaderValue,
) {
  useHttpAction((http) => {
    http.responseHeaders.append('Cross-Origin-Embedder-Policy', value);
  });
}
