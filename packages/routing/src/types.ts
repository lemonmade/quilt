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

export type Prefix = string | RegExp;

export type RelativeTo = 'root' | 'prefix';

/**
 * A representation of the search params for a target URL. When provided as an
 * object, the keys and values will be URI encoded before being turned into
 * the final query string.
 */
export type Search =
  | string
  | Record<string, string | undefined>
  | URLSearchParams;

/**
 * A description of a navigation target that the router can resolve into a URL.
 * The allowed types are resolved to URLs using the following rules:
 *
 * - When the value is a string, it will be used as a pathname. If it begins
 *   with a `/`, it will be treated as an absolute pathname; otherwise, it is
 *   considered a relative pathname, and will be appended to the pathname of the
 *   current URL. In addition to the pathname, the string can include a query string
 *   (separate from the path with a `?` character) and/ or a hash (separated from the
 *   path with a `#` character).
 * - When the value is a URL, its `href` is used as the exact target.
 * - When the value is an object, the `path`, `hash`, and `search` properties are
 *   used as those properties for the resolved URL. If `path` is omitted, it defaults
 *   to the path of the current URL. The `hash` and `search` default to empty values.
 *   The `search` property can either be provided directly as a query string
 *   (e.g., `'?page=2'`), as an object that will be URI encoded into a query
 *   string (e.g., `{page: '2'}`), or as a `URLSearchParams` instance.
 */
export type NavigateToLiteral =
  | string
  | URL
  | {
      path?: string;
      hash?: string;
      search?: Search;
    };

/**
 * A target that can be used for navigation-related APIs. It can either be
 * a literal target, or a function that accepts the current URL, and returns
 * a literal target.
 */
export type NavigateTo =
  | NavigateToLiteral
  | ((currentUrl: EnhancedURL) => NavigateToLiteral);
