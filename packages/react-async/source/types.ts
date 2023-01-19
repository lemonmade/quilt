import type {AsyncModule} from '@quilted/async';
import type {ComponentType, FunctionComponent} from 'react';

export type RenderTiming = 'server' | 'client';
export type HydrationTiming = 'immediate' | 'defer';
export type AssetLoadTiming = 'never' | 'preload' | 'load';

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
    ? () => void
    : (options: Options) => void;
}

export interface AsyncComponentType<
  T,
  Props extends Record<string, any>,
  PreloadOptions extends Record<string, any> = NoOptions,
> extends Preloadable<PreloadOptions>,
    FunctionComponent<Props> {
  load(): Promise<T>;
  readonly module: AsyncModule<T>;
  readonly Preload: ComponentType<PreloadOptions>;
}

export type PreloadOptions<T> = T extends Preloadable<infer U> ? U : never;
