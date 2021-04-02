import type {ReactNode} from 'react';

export type EnhancedURL = URL & {
  readonly prefix?: string;
  /**
   * The pathname of the app discarding the prefix part
   */
  readonly normalizedPath: string;
  readonly key: string;
  readonly state: {[key: string]: unknown};
};

export interface Matcher {
  (url: URL): boolean;
}

export type Match = string | RegExp | Matcher;

export type Prefix = string | RegExp;

export interface Focusable {
  focus(): void;
}

export type Search =
  | string
  | Record<string, string | undefined>
  | URLSearchParams;

export type NavigateToLiteral =
  | string
  | URL
  | {
      path?: string;
      hash?: string;
      search?: Search;
    };

export type NavigateTo =
  | NavigateToLiteral
  | ((currentUrl: EnhancedURL) => NavigateToLiteral);

export type Blocker = (to: EnhancedURL, redo: () => void) => boolean;

export interface RouteRenderDetails {
  url: EnhancedURL;
  matched: string;
  children?: ReactNode;
}

export interface RouteRenderPrefetchDetails {
  url: URL;
  matched: string;
}

export interface RouteDefinition {
  match?: Match;
  children?: RouteDefinition[];
  redirect?: NavigateTo;
  render?(details: RouteRenderDetails): ReactNode;
  renderPrefetch?(details: RouteRenderPrefetchDetails): ReactNode;
}

export type RelativeTo = 'root' | 'prefix';
