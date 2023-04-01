import {createContext} from 'react';
import type {MutableRefObject} from 'react';
import type {EnhancedURL, Focusable} from './types.ts';
import type {Router} from './router.ts';
import type {Preloader} from './preloader.ts';
import type {StaticRenderer} from './static.ts';

export const CurrentUrlContext = createContext<EnhancedURL | null>(null);
export const RouterContext = createContext<Router | null>(null);
export const PreloaderContext = createContext<Preloader | null>(null);
export const ConsumedPathContext = createContext<string | null>(null);
export const InitialUrlContext = createContext<URL | undefined>(
  typeof location === 'undefined' || typeof URL === 'undefined'
    ? undefined
    : new URL(location.href),
);
export const StaticRendererContext = createContext<StaticRenderer | null>(null);

export const FocusContext = createContext<MutableRefObject<
  Focusable | undefined | null
> | null>(null);
