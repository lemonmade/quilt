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
