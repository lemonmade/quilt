import {createContext} from 'react';
import {EnhancedURL} from './types';

export const CurrentUrlContext = createContext<EnhancedURL | null>(null);
export const RouterContext = createContext<import('./router').Router | null>(
  null,
);
export const SwitchContext = createContext<{matched(): void} | null>(null);
