export interface Matcher {
  (url: URL): boolean;
}

export type Match = string | RegExp | Matcher;

export interface MatchDetails {
  matched: string;
  consumed?: string;
}

// export type Prefix = string | RegExp;

// export type RelativeTo = 'root' | 'prefix';

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
