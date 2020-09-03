import type {Match, Prefix, EnhancedURL, NavigateTo, Search} from './types';
import type {Router} from './router';

export function enhanceUrl(
  url: URL,
  state: object,
  key: string,
  prefix?: Prefix,
): EnhancedURL {
  Object.defineProperty(url, 'state', {
    value: state,
    writable: false,
  });

  const extractedPrefix = extractPrefix(url, prefix);
  Object.defineProperty(url, 'prefix', {
    value: extractedPrefix,
    writable: false,
  });

  const normalizedPath = normalizeAsAbsolutePath(
    url.pathname.replace(extractedPrefix ?? '', ''),
  );

  Object.defineProperty(url, 'normalizedPath', {
    value: normalizedPath,
    writable: false,
  });

  Object.defineProperty(url, 'key', {
    value: key,
    writable: false,
  });

  return url as EnhancedURL;
}

export function resolveUrl(to: NavigateTo, from: EnhancedURL): URL {
  if (to instanceof URL) {
    if (to.origin !== from.origin) {
      throw new Error(
        `You can’t perform a client side navigation to ${to.href} from ${from.href}`,
      );
    }

    return to;
  } else if (typeof to === 'object') {
    const {pathname, search, hash} = to;

    // should make sure we insert the hash/ question mark
    const finalPathname = pathname ?? from.pathname;
    const finalSearch = searchToString(search ?? from.search);
    const finalHash = prefixIfNeeded('#', hash ?? from.hash);

    return new URL(
      prefixPath(`${finalPathname}${finalSearch}${finalHash}`, from.prefix),
      from.href,
    );
  } else if (typeof to === 'function') {
    return resolveUrl(to(from), from);
  }

  return new URL(prefixPath(to, from.prefix), postfixSlash(from.href));
}

function prefixPath(pathname: string, prefix?: string) {
  if (!prefix) return pathname;

  return pathname.indexOf('/') === 0
    ? `${postfixSlash(prefix)}${pathname.slice(1)}`
    : pathname;
}

function searchToString(search?: Search) {
  if (search == null) {
    return '';
  } else if (typeof search === 'string') {
    return prefixIfNeeded('?', search);
  } else if (search instanceof URLSearchParams) {
    return prefixIfNeeded('?', search.toString());
  } else {
    return prefixIfNeeded(
      '?',
      Object.keys(search).reduce<string>((searchString, key) => {
        return `${searchString}${key}=${encodeURIComponent(
          (search as any)[key],
        )}`;
      }, ''),
    );
  }
}

function prefixIfNeeded(prefix: string, value: string) {
  return value.length === 0 || value[0] === prefix
    ? value
    : `${prefix}${value}`;
}

export function createKey() {
  return `${String(Date.now())}${Math.random()}`;
}

export function postfixSlash(path: string) {
  if (path.length === 0) return '/';
  return path[path.length - 1] === '/' ? path : `${path}/`;
}

function removePostfixSlash(path: string) {
  if (path.length === 1) return path;
  return path[path.length - 1] === '/' ? path.slice(0, -1) : path;
}

function normalizeAsAbsolutePath(path: string) {
  return path[0] === '/'
    ? removePostfixSlash(path)
    : `/${removePostfixSlash(path)}`;
}

interface MatchDetails {
  matched: string;
  consumed?: string;
}

export function getMatchDetails(
  url: URL,
  router: Router,
  consumed?: string,
  match?: Match,
): MatchDetails | undefined {
  const pathDetails = splitUrl(url, router.prefix, consumed);

  if (match == null) {
    const matched = removePostfixSlash(pathDetails.remainderAbsolute);
    return {matched};
  } else if (typeof match === 'function') {
    if (!match(url)) return undefined;
    const matched = removePostfixSlash(pathDetails.remainderAbsolute);
    return {matched};
  } else if (typeof match === 'string') {
    const normalizedMatch = removePostfixSlash(match);
    const isAbsolute = normalizedMatch[0] === '/';

    if (isAbsolute) {
      if (!pathDetails.remainderAbsolute.startsWith(normalizedMatch)) {
        return undefined;
      }

      return {
        matched: normalizedMatch,
        consumed: normalizedMatch,
      };
    } else {
      if (!pathDetails.remainderRelative.startsWith(normalizedMatch)) {
        return undefined;
      }

      return {
        matched: normalizedMatch,
        consumed: `${pathDetails.previouslyConsumed}${normalizeAsAbsolutePath(
          normalizedMatch,
        )}`,
      };
    }
  } else if (match instanceof RegExp) {
    const matchAsRelative = pathDetails.remainderRelative.match(match);

    if (matchAsRelative != null && matchAsRelative.index! === 0) {
      return {
        matched: removePostfixSlash(matchAsRelative[0]),
        consumed: `${pathDetails.previouslyConsumed}${normalizeAsAbsolutePath(
          matchAsRelative[0],
        )}`,
      };
    }

    const matchAsAbsolute = pathDetails.remainderAbsolute.match(match);

    if (matchAsAbsolute == null || matchAsAbsolute.index! !== 0) {
      return undefined;
    }

    const normalizedMatch = removePostfixSlash(matchAsAbsolute[0]);

    return {
      matched: normalizedMatch,
      consumed: normalizedMatch,
    };
  }
}

function splitUrl(url: URL, prefix?: Prefix, consumed = '') {
  const resolvedPrefix = extractPrefix(url, prefix) ?? '';
  const remainderRelative = removePostfixSlash(
    url.pathname.replace(postfixSlash(`${resolvedPrefix}${consumed}`), ''),
  );

  return {
    isRoot: consumed.length === 0,
    prefix: resolvedPrefix,
    previouslyConsumed: consumed,
    remainderRelative,
    remainderAbsolute: `${postfixSlash(consumed)}${remainderRelative}`,
  };
}

export function containedByPrefix(url: URL, prefix?: Prefix) {
  return extractPrefix(url, prefix) != null;
}

export function extractPrefix(url: URL, prefix?: Prefix) {
  if (!prefix) return undefined;

  if (typeof prefix === 'string') {
    return url.pathname.indexOf(prefix) === 0
      ? removePostfixSlash(prefix)
      : undefined;
  }

  const regex = new RegExp(prefix.source);
  const match = regex.exec(url.pathname);
  return match != null && match.index === 0
    ? removePostfixSlash(match[0])
    : undefined;
}
