import {createContext, MutableRefObject} from 'react';
import type {EnhancedURL, Focusable} from './types';
import type {Router} from './router';
import type {Prefetcher} from './prefetcher';

export const CurrentUrlContext = createContext<EnhancedURL | null>(null);
export const RouterContext = createContext<Router | null>(null);
export const PrefetcherContext = createContext<Prefetcher | null>(null);
export const ConsumedPathContext = createContext<string | null>(null);

export const FocusContext = createContext<MutableRefObject<
  Focusable | undefined | null
> | null>(null);
