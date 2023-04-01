import type {
  Match,
  Prefix,
  EnhancedURL,
  NavigateTo,
  Search,
  RelativeTo,
  MatchDetails,
} from './types.ts';

export function enhanceUrl(url: URL, prefix?: Prefix): EnhancedURL {
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

  return url as EnhancedURL;
}

export function resolveUrl<URLType extends EnhancedURL = EnhancedURL>(
  to: NavigateTo<URLType>,
  from: URLType,
  relativeTo?: RelativeTo,
): URL {
  const prefix = relativeTo === 'root' ? '/' : from.prefix;

  if (to instanceof URL) {
    return new URL(to.href);
  } else if (typeof to === 'object') {
    const {path, search, hash} = to;

    const finalPathname = path ?? from.pathname;
    const finalSearch = searchToString(search);
    const finalHash = prefixIfNeeded('#', hash);

    return new URL(
      prefixPath(`${finalPathname}${finalSearch}${finalHash}`, prefix),
      urlToPostfixedOriginAndPath(from),
    );
  } else if (typeof to === 'function') {
    return resolveUrl(to(from), from, relativeTo);
  }

  return new URL(prefixPath(to, prefix), urlToPostfixedOriginAndPath(from));
}

export function getMatchDetails(
  url: URL,
  match?: Match,
  prefix?: Prefix,
  consumed?: string,
  exact = true,
  forceFallback = false,
): MatchDetails | undefined {
  const pathDetails = splitUrl(url, prefix, consumed);

  if (match == null) {
    const matched = removePostfixSlash(pathDetails.remainderAbsolute);
    return {matched};
  } else if (forceFallback) {
    return undefined;
  } else if (typeof match === 'function') {
    if (!match(url)) return undefined;
    const matched = removePostfixSlash(pathDetails.remainderAbsolute);
    return {matched};
  } else if (typeof match === 'string') {
    const normalizedMatch = removePostfixSlash(match);

    if (normalizedMatch[0] === '/') {
      if (
        !startsWithPath(pathDetails.remainderAbsolute, normalizedMatch, exact)
      ) {
        return undefined;
      }

      return {
        matched: normalizedMatch,
        consumed:
          normalizedMatch === '/'
            ? pathDetails.previouslyConsumed
            : `${pathDetails.previouslyConsumed}${normalizedMatch}`,
      };
    } else {
      if (
        !startsWithPath(pathDetails.remainderRelative, normalizedMatch, exact)
      ) {
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

    if (
      matchAsRelative != null &&
      matchAsRelative.index! === 0 &&
      startsWithPath(pathDetails.remainderRelative, matchAsRelative[0]!, exact)
    ) {
      return {
        matched: removePostfixSlash(matchAsRelative[0]!),
        consumed: `${pathDetails.previouslyConsumed}${normalizeAsAbsolutePath(
          matchAsRelative[0]!,
        )}`,
      };
    }

    const matchAsAbsolute = pathDetails.remainderAbsolute.match(match);

    if (
      matchAsAbsolute == null ||
      matchAsAbsolute.index! !== 0 ||
      !startsWithPath(pathDetails.remainderAbsolute, matchAsAbsolute[0]!, exact)
    ) {
      return undefined;
    }

    const normalizedMatch = removePostfixSlash(matchAsAbsolute[0]!);

    return {
      matched: normalizedMatch,
      consumed: normalizedMatch,
    };
  }
}

function urlToPostfixedOriginAndPath(url: URL) {
  return postfixSlash(`${url.origin}${url.pathname}`);
}

function prefixPath(pathname: string, prefix?: string) {
  if (!prefix) return pathname;

  return pathname.indexOf('/') === 0
    ? removePostfixSlash(`${postfixSlash(prefix)}${pathname.slice(1)}`)
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
        const value = (search as any)[key];
        return value
          ? `${searchString}${key}=${encodeURIComponent(value)}`
          : searchString;
      }, ''),
    );
  }
}

function prefixIfNeeded(prefix: string, value = '') {
  return value.length === 0 || value[0] === prefix
    ? value
    : `${prefix}${value}`;
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
    ? removePostfixSlash(match[0]!)
    : undefined;
}

function startsWithPath(fullPath: string, pathSegment: string, exact: boolean) {
  if (exact) return fullPath === pathSegment;

  return (
    fullPath.startsWith(pathSegment) &&
    (fullPath.length === pathSegment.length ||
      fullPath[pathSegment.length] === '/')
  );
}

function splitUrl(url: URL, prefix?: Prefix, consumed = '') {
  const resolvedPrefix = extractPrefix(url, prefix) ?? '';
  const fullConsumedPath = consumed
    ? `${resolvedPrefix}${consumed}`
    : resolvedPrefix;
  const remainderRelative = removePrefixSlash(
    removePostfixSlash(url.pathname.replace(fullConsumedPath, '')),
  );

  return {
    isRoot: consumed.length === 0,
    prefix: resolvedPrefix,
    previouslyConsumed: consumed,
    remainderRelative,
    remainderAbsolute: `/${remainderRelative}`,
  };
}

function removePrefixSlash(path: string) {
  return path[0] === '/' ? path.slice(1) : path;
}
