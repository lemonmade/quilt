import {createContext, RefObject} from 'react';
import {EnhancedURL, Focusable} from './types';

export const CurrentUrlContext = createContext<EnhancedURL | null>(null);
export const RouterContext = createContext<import('./router').Router | null>(
  null,
);
export const SwitchContext = createContext<{matched(): void} | null>(null);

export const FocusContext = createContext<RefObject<Focusable> | null>(null);
