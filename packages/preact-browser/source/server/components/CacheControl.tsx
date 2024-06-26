import {useCacheControl} from '../hooks/cache-control.ts';

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
  if (typeof document === 'object') return null;
  useCacheControl('value' in options ? options.value : options);
  return null;
}
