import type {Prefetchable, IfAllOptionalKeys, NoInfer} from '../types';

export function usePrefetch<PrefetchOptions extends Record<string, any>>(
  ...args: IfAllOptionalKeys<
    PrefetchOptions,
    [Prefetchable<PrefetchOptions>, NoInfer<PrefetchOptions>?],
    [Prefetchable<PrefetchOptions>, NoInfer<PrefetchOptions>]
  >
): ReturnType<typeof args[0]['usePrefetch']> {
  const [prefetchable, options = {}] = args;
  return (prefetchable.usePrefetch as any)(options);
}
