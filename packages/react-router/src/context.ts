import {createContext} from 'react';

export const CurrentUrlContext = createContext<URL | null>(null);
export const RouterContext = createContext<import('./router').Router | null>(
  null,
);
export const SwitchContext = createContext<{matched(): void} | null>(null);
