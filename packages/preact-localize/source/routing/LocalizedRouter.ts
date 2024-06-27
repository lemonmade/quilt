import {Router, type RouterOptions} from '@quilted/preact-router';

import type {RouteLocalization, ResolvedRouteLocalization} from './types.ts';

export class LocalizedRouter extends Router {
  readonly localization: ResolvedRouteLocalization;

  constructor(
    initial: ConstructorParameters<typeof Router>[0],
    {
      localization,
      isExternal: explicitIsExternal,
    }: {localization: RouteLocalization} & Pick<RouterOptions, 'isExternal'>,
  ) {
    const {localeFromURL} = localization;

    super(initial, {
      isExternal(url, currentURL) {
        return (
          matchedLocale !== localeFromURL(url) ||
          (explicitIsExternal?.(url, currentURL) ?? false)
        );
      },
    });

    const currentURL = this.currentRequest.url;

    const matchedLocale = localeFromURL(currentURL);

    const resolvedLocalization: ResolvedRouteLocalization = {
      locale: matchedLocale ?? localization.defaultLocale,
      ...localization,
    };

    this.localization = resolvedLocalization;

    const {pathname: rootPath} = localization.redirectURL(
      new URL('/', currentURL),
      {
        to: resolvedLocalization.locale,
      },
    );

    if (rootPath.length > 1) Object.assign(this, {base: rootPath});
  }
}
