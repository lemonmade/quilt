import {AsyncComponentType, IfAllOptionalKeys, NoInfer} from '../types';

export type Preloadable<PreloadOptions extends object> = Pick<
  AsyncComponentType<any, any, PreloadOptions, any, any>,
  'usePreload'
>;

export function usePreload<PreloadOptions extends object>(
  ...args: IfAllOptionalKeys<
    PreloadOptions,
    [Preloadable<PreloadOptions>, NoInfer<PreloadOptions>?],
    [Preloadable<PreloadOptions>, NoInfer<PreloadOptions>]
  >
): ReturnType<typeof args[0]['usePreload']> {
  const [preloadable, options = {}] = args;
  return (preloadable.usePreload as any)(options);
}
