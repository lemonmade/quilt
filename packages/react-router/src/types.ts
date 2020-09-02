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

export type Search = string | object | URLSearchParams;

export type NavigateToLiteral =
  | string
  | URL
  | {
      pathname?: string;
      hash?: string;
      search?: Search;
    };

export type NavigateTo =
  | NavigateToLiteral
  | ((currentUrl: EnhancedURL) => NavigateToLiteral);

export type Blocker = (to: EnhancedURL, redo: () => void) => boolean;

export interface RouteRenderDetails {
  url: EnhancedURL;
  matchedPath: string;
  children?: ReactNode;
}

export interface RouteDefinition {
  match?: Match;
  children?: RouteDefinition[];
  redirect?: NavigateTo;
  render?(details: RouteRenderDetails): ReactNode;
  renderPrefetch?(): ReactNode;
}
