import {redirect, type RequestHandler} from '@quilted/request-router';
import {parseAcceptLanguageHeader} from '@quilted/localize';

import type {
  RouteLocalization,
  ResolvedRouteLocalization,
  DefaultLocaleDefinition,
} from './routing.ts';

export type {
  RouteLocalization,
  ResolvedRouteLocalization,
  DefaultLocaleDefinition,
};

export interface RequestRouterLocalization {
  redirect(
    request: Request,
    options: {to: string} & Pick<
      NonNullable<Parameters<typeof redirect>[1]>,
      'status' | 'headers'
    >,
  ): Response;
  localizedRequestHandler(
    handler: RequestHandler,
    options?: {include?(request: Request): boolean},
  ): RequestHandler;
}

export function createRequestRouterLocalization({
  localization,
  requestLocale: customRequestLocale,
}: {
  localization: RouteLocalization;
  requestLocale?(
    request: Request,
    getDefaultFromRequest: () => string | undefined,
  ): string | undefined;
}): RequestRouterLocalization {
  const {matchLocale, redirectUrl, defaultLocale, localeFromUrl} = localization;

  const getDefaultLocaleFromRequest = (request: Request) => {
    const acceptLanguage = request.headers.get('Accept-Language');
    return (
      (acceptLanguage && parseAcceptLanguageHeader(acceptLanguage)) || undefined
    );
  };

  const getLocaleForRequest =
    customRequestLocale ?? getDefaultLocaleFromRequest;

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
    return redirect(redirectUrl(new URL(request.url), {to}), options);
  }

  return {
    redirect: localeRedirect,
    localizedRequestHandler(
      handler: RequestHandler,
      {include = () => true}: {include?(request: Request): boolean} = {},
    ): RequestHandler {
      return async (request, ...args) => {
        if (!include(request)) return handler(request, ...args);

        const url = new URL(request.url);
        const urlLocale = localeFromUrl(url);
        const requestLocale = getLocaleForRequest(request, () =>
          getDefaultLocaleFromRequest(request),
        );
        const matchedLocale =
          (requestLocale == null ? undefined : matchLocale(requestLocale)) ??
          defaultLocale;

        if (urlLocale !== matchedLocale) {
          return redirect(
            redirectUrl(url, {
              to: matchedLocale,
            }),
          );
        }

        return handler(request, ...args);
      };
    },
  };
}
