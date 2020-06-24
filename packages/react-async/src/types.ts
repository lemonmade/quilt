import type {ComponentType, FunctionComponent} from 'react';

export type DeferTiming = 'mount' | 'idle';
export type AssetTiming = 'never' | 'eventually' | 'soon' | 'immediate';

export type NonOptionalKeys<T> = {
  [K in keyof T]-?: undefined extends T[K] ? never : K;
}[keyof T];

export type IfAllOptionalKeys<Obj, If, Else = never> = NonOptionalKeys<
  Obj
> extends {
  length: 0;
}
  ? If
  : Else;

export type NoInfer<T> = {[K in keyof T]: T[K]} & T;

export interface AsyncHookTarget<
  PreloadOptions extends object,
  PrefetchOptions extends object,
  KeepFreshOptions extends object
> {
  usePreload(
    ...props: IfAllOptionalKeys<
      PreloadOptions,
      [NoInfer<PreloadOptions>?],
      [NoInfer<PreloadOptions>]
    >
  ): () => () => void;
  usePrefetch(
    ...props: IfAllOptionalKeys<
      PrefetchOptions,
      [NoInfer<PrefetchOptions>?],
      [NoInfer<PrefetchOptions>]
    >
  ): () => () => void;
  useKeepFresh(
    ...props: IfAllOptionalKeys<
      KeepFreshOptions,
      [NoInfer<KeepFreshOptions>?],
      [NoInfer<KeepFreshOptions>]
    >
  ): () => () => void;
}

export interface AsyncComponentType<
  T,
  Props extends object,
  PreloadOptions extends object,
  PrefetchOptions extends object,
  KeepFreshOptions extends object
>
  extends AsyncHookTarget<PreloadOptions, PrefetchOptions, KeepFreshOptions>,
    FunctionComponent<Props> {
  load(): Promise<T>;
  readonly Preload: ComponentType<PreloadOptions>;
  readonly Prefetch: ComponentType<PrefetchOptions>;
  readonly KeepFresh: ComponentType<KeepFreshOptions>;
}

export type PreloadOptions<T> = T extends AsyncHookTarget<infer U, any, any>
  ? U
  : never;

export type PrefetchOptions<T> = T extends AsyncHookTarget<any, infer U, any>
  ? U
  : never;

export type KeepFreshOptions<T> = T extends AsyncHookTarget<any, any, infer U>
  ? U
  : never;
