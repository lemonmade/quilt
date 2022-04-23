import {redirect} from '@quilted/http-handlers';
import type {Response, Request, RequestHandler} from '@quilted/http-handlers';
import {parseAcceptLanguageHeader} from '@quilted/localize';

import type {
  RouteLocalization,
  ResolvedRouteLocalization,
  DefaultLocaleDefinition,
} from './routing';

export type {
  RouteLocalization,
  ResolvedRouteLocalization,
  DefaultLocaleDefinition,
};

export interface HttpHandlerLocalization {
  redirect(
    request: Request,
    options: {to: string} & Pick<
      NonNullable<Parameters<typeof redirect>[1]>,
      'status' | 'headers'
    >,
  ): Response;
  findMatchedLocale(requestLocale: string): string | undefined;
  localizedRequestHandler(
    handler: RequestHandler,
    options?: {include?(request: Request): boolean},
  ): RequestHandler;
}

export function createHttpHandlerLocalization({
  localization,
  requestLocale: customRequestLocale,
  matchedLocale: customMatchedLocale,
}: {
  localization: RouteLocalization;
  requestLocale?(
    request: Request,
    getDefaultFromRequest: () => string | undefined,
  ): string | undefined;
  matchedLocale?(requestLocale: string): string | undefined;
}): HttpHandlerLocalization {
  const {locales, redirectUrl, defaultLocale, localeFromUrl} = localization;

  const getDefaultLocaleFromRequest = (request: Request) => {
    const acceptLanguage = request.headers.get('Accept-Language');
    return (
      (acceptLanguage && parseAcceptLanguageHeader(acceptLanguage)) || undefined
    );
  };

  const getLocaleForRequest =
    customRequestLocale ?? getDefaultLocaleFromRequest;

  const findMatchedLocale = customMatchedLocale ?? createLocaleMatcher(locales);

  function localeRedirect(
    request: Request,
    {
      to,
      ...options
    }: {to: string} & Pick<
      NonNullable<Parameters<typeof redirect>[1]>,
      'status' | 'headers'
    >,
  ): Response {
    return redirect(redirectUrl(request.url, {to}), options);
  }

  return {
    redirect: localeRedirect,
    findMatchedLocale,
    localizedRequestHandler(
      handler: RequestHandler,
      {include = () => true}: {include?(request: Request): boolean} = {},
    ): RequestHandler {
      return async (request, ...args) => {
        if (!include(request)) return handler(request, ...args);

        const urlLocale = localeFromUrl(request.url);
        const requestLocale = getLocaleForRequest(request, () =>
          getDefaultLocaleFromRequest(request),
        );
        const matchedLocale =
          (requestLocale == null
            ? undefined
            : findMatchedLocale(requestLocale)) ?? defaultLocale;

        if (urlLocale !== matchedLocale) {
          return redirect(
            redirectUrl(request.url, {
              to: matchedLocale,
            }),
          );
        }

        return handler(request, ...args);
      };
    },
  };
}

function createLocaleMatcher(locales: string[]) {
  const sortedLocales = [...locales].sort((a, b) => b.length - a.length);

  return function getLocale(requestLocale: string) {
    const language = requestLocale.split('-')[0];

    const matchedLocale = sortedLocales.find(
      (locale) => locale === requestLocale || locale === language,
    );

    return matchedLocale;
  };
}
