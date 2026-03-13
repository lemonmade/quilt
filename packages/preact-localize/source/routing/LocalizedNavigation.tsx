import type {RenderableProps} from 'preact';
import {useContext, useMemo} from 'preact/hooks';
import {useBrowserDetails} from '@quilted/preact-browser';
import {QuiltFrameworkContextPreact} from '@quilted/preact-context';
import {Localization} from '@quilted/localize';
import {Navigation, Routes, type NavigationOptions, type RouteDefinition} from '@quilted/preact-router';

import {RouteLocalizationContext} from './context.ts';
import type {RouteLocalization, ResolvedRouteLocalization} from './types.ts';

export class LocalizedNavigation extends Navigation {
  readonly localization: ResolvedRouteLocalization;

  constructor(
    initial: ConstructorParameters<typeof Navigation>[0],
    {
      localization,
      isExternal: explicitIsExternal,
    }: {localization: RouteLocalization} & Pick<NavigationOptions, 'isExternal'>,
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

export interface LocalizedNavigationProps<Context = unknown> {
  locale?: string;
  navigation?: LocalizedNavigation;
  localization?: RouteLocalization;
  routes?: readonly RouteDefinition<any, any, Context>[];
  context?: Context;
}

export function LocalizedNavigationProvider<Context = unknown>({
  locale: explicitLocale,
  navigation,
  routes,
  context,
  localization,
  children,
}: RenderableProps<LocalizedNavigationProps<Context>>) {
  const browser = useBrowserDetails({optional: true});
  const resolvedNavigation = useMemo(
    () =>
      navigation ??
      new LocalizedNavigation(browser?.request.url, {localization: localization!}),
    [navigation],
  );
  const resolvedLocalization = resolvedNavigation.localization;

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

  const localize = useMemo(
    () => new Localization(resolvedLocale),
    [resolvedLocale],
  );

  const existingContext = useContext(QuiltFrameworkContextPreact);
  const newQuiltContext = useMemo(
    () => ({...existingContext, navigation: resolvedNavigation, localization: localize}),
    [existingContext, resolvedNavigation, localize],
  );

  const content = routes ? (
    <Routes list={routes} context={context} />
  ) : (
    children
  );

  return (
    <QuiltFrameworkContextPreact.Provider value={newQuiltContext}>
      <RouteLocalizationContext.Provider value={resolvedLocalization}>
        {content}
      </RouteLocalizationContext.Provider>
    </QuiltFrameworkContextPreact.Provider>
  );
}
