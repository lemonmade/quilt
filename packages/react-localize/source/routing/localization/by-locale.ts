import type {RouteLocalization} from '../types';

export function createRouteLocalization({
  locales,
  default: defaultLocale,
}: {
  locales: Map<string, string>;
  default: string;
}): RouteLocalization {
  const sortedLocales = [...locales].sort(
    ([, a], [, b]) => b.length - a.length,
  );

  return {
    locales: [...locales.keys()],
    redirectUrl,
    localeFromUrl,
    defaultLocale,
  };

  function localeFromUrl(url: URL) {
    const hostname = url.hostname.toLowerCase();
    const pathname = normalizePath(url.pathname.toLowerCase());

    for (const [locale, target] of sortedLocales) {
      if (target.startsWith('/')) {
        if (pathname.startsWith(target)) return locale;
      } else {
        if (hostname === target) return locale;
      }
    }
  }

  function redirectUrl(from: URL, {to: toLocale}: {to: string}) {
    const fromLocale = localeFromUrl(from);
    const toUrl = new URL(from);

    if (fromLocale === toLocale) return toUrl;

    const target = locales.get(toLocale) ?? locales.get(defaultLocale)!;

    if (target.startsWith('/')) {
      const fromTarget =
        fromLocale == null ? '/' : locales.get(fromLocale) ?? '/';

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
