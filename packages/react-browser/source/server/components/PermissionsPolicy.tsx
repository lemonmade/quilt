import {usePermissionsPolicy} from '../hooks/permissions-policy.ts';

interface ExplicitProps {
  /**
   * If you provide the `value` prop, that string will be used as the
   * `Permissions-Policy` header directly.
   */
  value: string;
}

type Props =
  | ExplicitProps
  | Exclude<Parameters<typeof usePermissionsPolicy>[0], string>;

/**
 * A component that sets the `Permissions-Policy` header for this request.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy
 */
export function PermissionsPolicy(options: Props) {
  if (typeof document === 'object') return null;
  usePermissionsPolicy('value' in options ? options.value : options);
  return null;
}
