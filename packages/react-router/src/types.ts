export type EnhancedURL = URL & {
  readonly state: {key?: string; [key: string]: unknown};
};

export interface Matcher {
  (url: URL): boolean;
}

export type Match = string | RegExp | Matcher;
