import {useContentSecurityPolicy} from '../hooks/content-security-policy.ts';

interface ExplicitProps {
  /**
   * If you provide the `value` key, that string will be used as the
   * `Content-Security-Policy` header directly.
   */
  value: string;
}

type Props =
  | ExplicitProps
  | Exclude<Parameters<typeof useContentSecurityPolicy>[0], string>;

/**
 * A component that sets the `Content-Security-Policy` header for this request.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy
 */
export function ContentSecurityPolicy(options: Props) {
  if (typeof document === 'object') return null;
  useContentSecurityPolicy('value' in options ? options.value : options);
  return null;
}
