import type {ComponentType, FunctionComponent} from 'react';

export type DeferTiming = 'mount' | 'idle';
export type AssetTiming = 'never' | 'eventually' | 'soon' | 'immediate';

export type NonOptionalKeys<T> = {
  [K in keyof T]-?: undefined extends T[K] ? never : K;
}[keyof T];

export type IfAllOptionalKeys<
  Obj,
  If,
  Else = never,
> = NonOptionalKeys<Obj> extends {
  length: 0;
}
  ? If
  : Else;

export type NoInfer<T> = {[K in keyof T]: T[K]} & T;

export type NoOptions = Record<string, never>;

export interface Preloadable<Options extends Record<string, any> = NoOptions> {
  readonly usePreload: Options extends NoOptions
    ? () => () => undefined | (() => void)
    : (options: Options) => () => undefined | (() => void);
}

export interface Prefetchable<Options extends Record<string, any> = NoOptions> {
  readonly usePrefetch: Options extends NoOptions
    ? () => () => undefined | (() => void)
    : (options: Options) => () => undefined | (() => void);
}

export interface AsyncComponentType<
  T,
  Props extends Record<string, any>,
  PreloadOptions extends Record<string, any> = NoOptions,
  PrefetchOptions extends Record<string, any> = NoOptions,
> extends Preloadable<PreloadOptions>,
    Prefetchable<PrefetchOptions>,
    FunctionComponent<Props> {
  load(): Promise<T>;
  readonly Preload: ComponentType<PreloadOptions>;
  readonly Prefetch: ComponentType<PrefetchOptions>;
}

export type PreloadOptions<T> = T extends Preloadable<infer U> ? U : never;
export type PrefetchOptions<T> = T extends Prefetchable<infer U> ? U : never;
