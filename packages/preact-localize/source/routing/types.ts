export interface RouteLocalization {
  readonly locales: string[];
  readonly defaultLocale: string;
  matchLocale(locale: string): string | undefined;
  redirectURL(from: URL, options: {to: string}): URL;
  localeFromURL(url: URL): string | undefined;
}

export interface ResolvedRouteLocalization extends RouteLocalization {
  readonly locale: string;
}

export interface DefaultLocaleDefinition {
  locale: string;
  nested?: boolean;
}
