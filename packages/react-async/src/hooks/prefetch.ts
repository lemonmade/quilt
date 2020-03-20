import {AsyncComponentType, IfAllOptionalKeys, NoInfer} from '../types';

export type Prefetchable<PrefetchOptions extends object> = Pick<
  AsyncComponentType<any, any, any, PrefetchOptions, any>,
  'usePrefetch'
>;

export function usePrefetch<PrefetchOptions extends object>(
  ...args: IfAllOptionalKeys<
    PrefetchOptions,
    [Prefetchable<PrefetchOptions>, NoInfer<PrefetchOptions>?],
    [Prefetchable<PrefetchOptions>, NoInfer<PrefetchOptions>]
  >
): ReturnType<typeof args[0]['usePrefetch']> {
  const [prefetchable, options = {}] = args;
  return (prefetchable.usePrefetch as any)(options);
}
