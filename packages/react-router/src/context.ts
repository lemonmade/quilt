import {createContext} from 'react';
import type {MutableRefObject} from 'react';
import type {
  EnhancedURL,
  Focusable,
  Preloader,
  PreloadRegistrar,
  RouteChangeScrollRestorationRegistrar,
} from './types';
import type {Router} from './router';
import type {StaticRenderer} from './static';

export const CurrentUrlContext = createContext<EnhancedURL | null>(null);
export const RouterContext = createContext<Router | null>(null);
export const ConsumedPathContext = createContext<string | null>(null);
export const InitialUrlContext = createContext<URL | undefined>(
  typeof location === 'undefined' || typeof URL === 'undefined'
    ? undefined
    : new URL(location.href),
);
export const StaticRendererContext = createContext<StaticRenderer | null>(null);
export const PreloaderContext = createContext<Preloader | null>(null);
export const PreloadRegistrarContext = createContext<PreloadRegistrar | null>(
  null,
);
export const ScrollRestorationRegistrarContext =
  createContext<RouteChangeScrollRestorationRegistrar | null>(null);

export const FocusRefContext = createContext<MutableRefObject<
  Focusable | undefined | null
> | null>(null);
