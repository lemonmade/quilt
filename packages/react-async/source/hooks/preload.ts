import type {Preloadable, IfAllOptionalKeys, NoInfer} from '../types';

export function usePreload<PreloadOptions extends Record<string, any>>(
  ...args: IfAllOptionalKeys<
    PreloadOptions,
    [Preloadable<PreloadOptions>, NoInfer<PreloadOptions>?],
    [Preloadable<PreloadOptions>, NoInfer<PreloadOptions>]
  >
): ReturnType<typeof args[0]['usePreload']> {
  const [preloadable, options = {}] = args;
  return (preloadable.usePreload as any)(options);
}
