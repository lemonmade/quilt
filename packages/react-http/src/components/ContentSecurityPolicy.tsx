import {useContentSecurityPolicy} from '../hooks';

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
 */
export function ContentSecurityPolicy(options: Props) {
  useContentSecurityPolicy('value' in options ? options.value : options);
  return null;
}
