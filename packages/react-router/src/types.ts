import type {MutableRefObject, ReactNode} from 'react';
import type {
  Match,
  NavigateTo,
  EnhancedURL as BaseEnhancedURL,
} from '@quilted/routing';

export type {Match, NavigateTo};

export interface State {
  [key: string]: unknown;
}

export type EnhancedURL = BaseEnhancedURL & {
  readonly key: string;
  readonly state: State;
};

export interface MatchDetails {
  matched: string;
  consumed?: string;
}

export interface Focusable {
  focus(): void;
}

export interface NavigationBlockDetails {
  targetUrl: EnhancedURL;
  allow(): void;
}

export type NavigationBlocker = (details: NavigationBlockDetails) => boolean;

export interface RouteRenderDetails {
  url: EnhancedURL;
  matched: string;
  consumed?: string;
  children?: ReactNode;
}

export interface RouteRenderPreloadDetails {
  url: URL;
  matched: string;
}

export interface RouteDefinition {
  match?: Match;
  exact?: boolean;
  children?: RouteDefinition[];
  redirect?: NavigateTo;
  render?(details: RouteRenderDetails): ReactNode;
  renderPreload?(details: RouteRenderPreloadDetails): ReactNode;
  renderStatic?: boolean | (() => string[] | Promise<string[]>);
}

export interface Preloader {
  readonly level: 'high' | 'low';
  add(url: URL): () => void;
}

export interface PreloadRegistrar {
  register(
    routes: RouteDefinition[],
    consumed?: string,
  ): (routes: RouteDefinition[], consumed?: string) => void;
}

export interface RouteChangeScrollRestorationCache {
  get(id: string, url: EnhancedURL): number | undefined;
  set(id: string, url: EnhancedURL, scroll: number): void;
}

export interface RouteChangeScrollRestorationDetails {
  targetUrl: EnhancedURL;
  previousUrl?: EnhancedURL;
  restore(): void;
}

export interface RouteChangeScrollRestorationHandler {
  (details: RouteChangeScrollRestorationDetails): boolean;
}

export interface RouteChangeScrollRestorationRegistration {
  ref: MutableRefObject<HTMLElement | null>;
  handler?: RouteChangeScrollRestorationHandler;
}

export interface RouteChangeScrollRestorationRegistrar {
  get(id: string): RouteChangeScrollRestorationRegistration;
  [Symbol.iterator](): IterableIterator<
    [string, RouteChangeScrollRestorationRegistration]
  >;
}
