import type {RenderableProps} from 'preact';
import {useMemo} from 'preact/hooks';
import {useBrowserDetails} from '@quilted/preact-browser';
import {Navigation, type RouteDefinition} from '@quilted/preact-router';

import {Localization} from '../Localization.tsx';

import {LocalizedRouter} from './LocalizedRouter.ts';
import {RouteLocalizationContext} from './context.ts';
import type {RouteLocalization} from './types.ts';

export interface LocalizedNavigationProps<Context = unknown> {
  locale?: string;
  router?: LocalizedRouter;
  localization?: RouteLocalization;
  routes?: readonly RouteDefinition<any, any, Context>[];
  context?: Context;
}

export function LocalizedNavigation<Context = unknown>({
  locale: explicitLocale,
  router,
  routes,
  context,
  localization,
  children,
}: RenderableProps<LocalizedNavigationProps<Context>>) {
  const browser = useBrowserDetails({optional: true});
  const resolvedRouter = useMemo(
    () =>
      router ??
      new LocalizedRouter(browser?.request.url, {localization: localization!}),
    [router],
  );
  const resolvedLocalization = resolvedRouter.localization;

  const localeFromEnvironment = browser?.locale.value;

  let resolvedLocale: string;

  if (explicitLocale) {
    resolvedLocale = explicitLocale;
  } else if (
    localeFromEnvironment != null &&
    localeFromEnvironment
      .toLowerCase()
      .startsWith(resolvedLocalization.locale.toLowerCase())
  ) {
    resolvedLocale = localeFromEnvironment;
  } else {
    resolvedLocale = resolvedLocalization.locale;
  }

  return (
    <Localization locale={resolvedLocale}>
      <RouteLocalizationContext.Provider value={resolvedLocalization}>
        <Navigation router={resolvedRouter} routes={routes} context={context}>
          {children}
        </Navigation>
      </RouteLocalizationContext.Provider>
    </Localization>
  );
}
