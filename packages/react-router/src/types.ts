export type EnhancedURL = URL & {
  readonly prefix?: string;
  readonly state: {key?: string; [key: string]: unknown};
};

export interface Matcher {
  (url: URL): boolean;
}

export type Match = string | RegExp | Matcher;

export interface Focusable {
  focus(): void;
}
