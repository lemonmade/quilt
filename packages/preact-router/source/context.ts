import {type RefObject} from 'preact';
import {createOptionalContext} from '@quilted/preact-context';

import type {EnhancedURL, Focusable} from './types.ts';
import type {Router} from './router.ts';
import type {Preloader} from './preloader.ts';
import type {StaticRenderer} from './static.ts';

export const CurrentUrlContext = createOptionalContext<EnhancedURL>();
export const RouterContext = createOptionalContext<Router>();
export const PreloaderContext = createOptionalContext<Preloader>();
export const ConsumedPathContext = createOptionalContext<string>();
export const StaticRendererContext = createOptionalContext<StaticRenderer>();
export const InitialURLContext = createOptionalContext<URL>(
  typeof location === 'undefined' || typeof URL === 'undefined'
    ? undefined
    : new URL(location.href),
);

export const FocusContext =
  createOptionalContext<RefObject<Focusable | undefined | null>>();
