import {ReactElement} from 'react';
import {Resolver} from '@quilted/async';

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
  T,
  PreloadOptions extends object,
  PrefetchOptions extends object,
  KeepFreshOptions extends object
> {
  readonly resolver: Resolver<T>;
  usePreload(
    ...props: IfAllOptionalKeys<
      PreloadOptions,
      [NoInfer<PreloadOptions>?],
      [NoInfer<PreloadOptions>]
    >
  ): () => void;
  usePrefetch(
    ...props: IfAllOptionalKeys<
      PrefetchOptions,
      [NoInfer<PrefetchOptions>?],
      [NoInfer<PrefetchOptions>]
    >
  ): () => void;
  useKeepFresh(
    ...props: IfAllOptionalKeys<
      KeepFreshOptions,
      [NoInfer<KeepFreshOptions>?],
      [NoInfer<KeepFreshOptions>]
    >
  ): () => void;
}

export interface AsyncComponentType<
  T,
  Props extends object,
  PreloadOptions extends object,
  PrefetchOptions extends object,
  KeepFreshOptions extends object
>
  extends AsyncHookTarget<
    T,
    PreloadOptions,
    PrefetchOptions,
    KeepFreshOptions
  > {
  (props: Props): ReactElement<Props>;
  Preload(props: PreloadOptions): React.ReactElement<{}> | null;
  Prefetch(props: PrefetchOptions): React.ReactElement<{}> | null;
  KeepFresh(props: KeepFreshOptions): React.ReactElement<{}> | null;
}

export type PreloadOptions<T> = T extends AsyncHookTarget<
  any,
  infer U,
  any,
  any
>
  ? U
  : never;

export type PrefetchOptions<T> = T extends AsyncHookTarget<
  any,
  any,
  infer U,
  any
>
  ? U
  : never;

export type KeepFreshOptions<T> = T extends AsyncHookTarget<
  any,
  any,
  any,
  infer U
>
  ? U
  : never;
