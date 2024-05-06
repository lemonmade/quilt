import {useStrictTransportSecurity} from '../hooks/strict-transport-security.ts';

interface ExplicitProps {
  /**
   * If you provide the `value` key, that string will be used as the
   * `Strict-Transport-Security` header directly.
   */
  value: string;
}

type Props =
  | ExplicitProps
  | Exclude<
      Parameters<typeof useStrictTransportSecurity>[0],
      string | undefined
    >;

/**
 * A component that sets the `Strict-Transport-Security` header for this request.
 * When no props are passed, this component uses the recommended value from
 * https://hstspreload.org/, which prefers HTTPS for two years, includes all
 * subdomains, and allows the domain to be placed on HTTPS preload lists.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security
 */
export function StrictTransportSecurity(options: Props) {
  if (typeof document === 'object') return null;
  useStrictTransportSecurity('value' in options ? options.value : options);
  return null;
}
