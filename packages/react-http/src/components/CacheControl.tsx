import {useCacheControl} from '../hooks';

interface ExplicitProps {
  /**
   * If you provide the `value` key, that string will be used as the
   * Cache-Control directly.
   */
  value: string;
}

type Props =
  | ExplicitProps
  | Exclude<Parameters<typeof useCacheControl>[0], string>;

/**
 * A component that sets the `Cache-Control` header for this request.
 */
export function CacheControl(options: Props) {
  useCacheControl('value' in options ? options.value : options);
  return null;
}
