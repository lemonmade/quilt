import type {RouteLocalization} from '../types.ts';

export function createRouteLocalization({
  locales: localeMap,
  default: defaultLocale,
}: {
  locales: Map<string, string>;
  default: string;
}): RouteLocalization {
  const sortedLocaleMap = [...localeMap].sort(
    ([, a], [, b]) => b.length - a.length,
  );

  const locales = [...localeMap.keys()].sort((a, b) => b.length - a.length);

  return {
    locales,
    redirectURL,
    matchLocale,
    localeFromURL,
    defaultLocale,
  };

  function matchLocale(requestLocale: string) {
    const language = requestLocale.split('-')[0];

    return locales.find(
      (locale) => locale === requestLocale || locale === language,
    );
  }

  function localeFromURL(url: URL) {
    const hostname = url.hostname.toLowerCase();
    const pathname = normalizePath(url.pathname.toLowerCase());

    for (const [locale, target] of sortedLocaleMap) {
      if (target.startsWith('/')) {
        if (pathname.startsWith(target)) return locale;
      } else {
        if (hostname === target) return locale;
      }
    }
  }

  function redirectURL(from: URL, {to: toLocale}: {to: string}) {
    const fromLocale = localeFromURL(from);
    const toUrl = new URL(from);

    if (fromLocale === toLocale) return toUrl;

    const target = localeMap.get(toLocale) ?? localeMap.get(defaultLocale)!;

    if (target.startsWith('/')) {
      const fromTarget =
        fromLocale == null ? '/' : localeMap.get(fromLocale) ?? '/';

      toUrl.pathname = normalizePath(
        toUrl.pathname.replace(fromTarget, target),
      );
    } else {
      toUrl.hostname = target;
    }

    return toUrl;
  }
}

function normalizePath(path: string) {
  if (path.length === 0) return '/';
  return path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;
}
