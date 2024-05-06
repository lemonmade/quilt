import {useCrossOriginResourcePolicy} from '../hooks/cross-origin-resource-policy.ts';

/**
 * Sets the `Cross-Origin-Resource-Policy` header for this request.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Resource-Policy
 * @see https://web.dev/security-headers/#corp
 */
export function CrossOriginResourcePolicy({
  value,
}: {
  value: Parameters<typeof useCrossOriginResourcePolicy>[0];
}) {
  if (typeof document === 'object') return null;
  useCrossOriginResourcePolicy(value);
  return null;
}
