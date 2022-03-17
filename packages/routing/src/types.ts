export type EnhancedURL = URL & {
  readonly prefix?: string;
  /**
   * The pathname of the app discarding the prefix part
   */
  readonly normalizedPath: string;
};

export interface Matcher {
  (url: URL): boolean;
}

export type Match = string | RegExp | Matcher;

export interface MatchDetails {
  matched: string;
  consumed?: string;
}

export type Prefix = string | RegExp;

export type RelativeTo = 'root' | 'prefix';

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
