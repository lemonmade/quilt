import {useCrossOriginOpenerPolicy} from '../hooks';

/**
 * Sets the `Cross-Origin-Opener-Policy` header for this request.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Opener-Policy
 * @see https://web.dev/security-headers/#coop
 */
export function CrossOriginOpenerPolicy({
  value,
}: {
  value: Parameters<typeof useCrossOriginOpenerPolicy>[0];
}) {
  useCrossOriginOpenerPolicy(value);
  return null;
}
