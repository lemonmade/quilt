export interface RouteMatcher {
  (url: URL): boolean;
}

export type RouteMatch = string | boolean | RegExp | RouteMatcher;

export interface RouteMatchDetails {
  matched: string;
  consumed?: string;
}

export type NavigateToSearch =
  | string
  | Record<string, string | undefined>
  | URLSearchParams;

export type NavigateToLiteral =
  | string
  | URL
  | {
      path?: string;
      hash?: string;
      search?: NavigateToSearch;
    };

export type NavigateTo =
  | NavigateToLiteral
  | ((currentURL: URL) => NavigateToLiteral);
