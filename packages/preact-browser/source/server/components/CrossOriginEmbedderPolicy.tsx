import {useCrossOriginEmbedderPolicy} from '../hooks/cross-origin-embedder-policy.ts';

/**
 * Sets the `Cross-Origin-Embedder-Policy` header for this request.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Embedder-Policy
 * @see https://web.dev/security-headers/#coop
 */
export function CrossOriginEmbedderPolicy({
  value,
}: {
  value: Parameters<typeof useCrossOriginEmbedderPolicy>[0];
}) {
  if (typeof document === 'object') return null;
  useCrossOriginEmbedderPolicy(value);
  return null;
}
