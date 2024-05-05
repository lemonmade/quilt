import {type CrossOriginEmbedderPolicyHeaderValue} from '@quilted/http';
import {useBrowserResponseAction} from './browser-response-action.ts';

/**
 * Sets the `Cross-Origin-Embedder-Policy` header for this request.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Embedder-Policy
 * @see https://web.dev/security-headers/#coep
 */
export function useCrossOriginEmbedderPolicy(
  value: CrossOriginEmbedderPolicyHeaderValue,
) {
  if (typeof document === 'object') return;

  useBrowserResponseAction((response) => {
    response.headers.append('Cross-Origin-Embedder-Policy', value);
  });
}
