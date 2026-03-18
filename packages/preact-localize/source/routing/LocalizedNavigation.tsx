import {Navigation, type NavigationOptions} from '@quilted/preact-router';

import type {RouteLocalization, ResolvedRouteLocalization} from './types.ts';

export class LocalizedNavigation extends Navigation {
  readonly routes: ResolvedRouteLocalization;

  get locale() {
    return this.routes.locale;
  }

  constructor(
    initial: ConstructorParameters<typeof Navigation>[0],
    {
      routes,
      isExternal: explicitIsExternal,
    }: {routes: RouteLocalization} & Pick<NavigationOptions, 'isExternal'>,
  ) {
    const {localeFromURL} = routes;

    let matchedLocale: string | undefined;

    super(initial, {
      isExternal(url, currentURL) {
        return (
          matchedLocale !== localeFromURL(url) ||
          (explicitIsExternal?.(url, currentURL) ?? false)
        );
      },
    });

    const currentURL = this.currentRequest.url;

    matchedLocale = localeFromURL(currentURL);

    const resolvedLocalization: ResolvedRouteLocalization = {
      locale: matchedLocale ?? routes.defaultLocale,
      ...routes,
    };

    this.routes = resolvedLocalization;

    const {pathname: rootPath} = routes.redirectURL(new URL('/', currentURL), {
      to: resolvedLocalization.locale,
    });

    if (rootPath.length > 1) Object.assign(this, {base: rootPath});
  }
}
