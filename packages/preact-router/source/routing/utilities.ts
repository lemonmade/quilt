import type {
  // Prefix,
  NavigateTo,
  NavigateToSearch,
} from './types.ts';

export function resolveURL(
  to: NavigateTo,
  from: URL,
  // relativeTo?: RelativeTo,
): URL {
  const prefix = '/';
  // const prefix = relativeTo === 'root' ? '/' : from.prefix;

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
    return resolveURL(
      to(from),
      from,
      // relativeTo,
    );
  }

  return new URL(prefixPath(to, prefix), urlToPostfixedOriginAndPath(from));
}

const SINGLE_SEGMENT_REGEX = /[^/]+/;

export function testMatch(
  url: URL,
  match?: undefined | '*' | true,
  consumed?: string,
  exact?: boolean,
): {matched: string} | undefined;
export function testMatch(
  url: URL,
  match: string,
  consumed?: string,
  exact?: boolean,
): {consumed: string; matched: string} | undefined;
export function testMatch(
  url: URL,
  match: RegExp,
  consumed?: string,
  exact?: boolean,
): {consumed: string; matched: RegExpMatchArray} | undefined;
export function testMatch(
  url: URL,
  match?: string | RegExp | true,
  consumed?: string,
  exact?: boolean,
):
  | {consumed?: never; matched: string}
  | {consumed: string; matched: RegExpMatchArray}
  | {consumed: string; matched: string}
  | undefined;
export function testMatch(
  url: URL,
  match?: string | RegExp | true,
  consumed?: string,
  exact: boolean = true,
):
  | {consumed?: never; matched: string}
  | {consumed: string; matched: RegExpMatchArray}
  | {consumed: string; matched: string}
  | undefined {
  const pathDetails = splitUrl(url, consumed);

  if (match == null || match === true || match === '*') {
    const matched = pathDetails.remainderRelative;
    return {matched};
  } else if (typeof match === 'string') {
    if (match[0] === ':') {
      const matchResult = testMatch(url, SINGLE_SEGMENT_REGEX, consumed, exact);
      if (matchResult == null) return matchResult;
      return {matched: matchResult.matched[0], consumed: matchResult.consumed};
    }

    const normalizedMatch = removePostfixSlash(match);

    if (normalizedMatch[0] === '/') {
      if (
        !startsWithPath(pathDetails.remainderAbsolute, normalizedMatch, exact)
      ) {
        return undefined;
      }

      return {
        matched: removePrefixSlash(normalizedMatch),
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
        matched: matchAsRelative,
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

    return {
      matched: matchAsAbsolute,
      consumed: `${pathDetails.previouslyConsumed}${removePostfixSlash(matchAsAbsolute[0]!)}`,
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

function searchToString(search?: NavigateToSearch) {
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

// export function containedByPrefix(url: URL, prefix?: Prefix) {
//   return extractPrefix(url, prefix) != null;
// }

// export function extractPrefix(url: URL, prefix?: Prefix) {
//   if (!prefix) return undefined;

//   if (typeof prefix === 'string') {
//     return url.pathname.indexOf(prefix) === 0
//       ? removePostfixSlash(prefix)
//       : undefined;
//   }

//   const regex = new RegExp(prefix.source);
//   const match = regex.exec(url.pathname);
//   return match != null && match.index === 0
//     ? removePostfixSlash(match[0]!)
//     : undefined;
// }

function startsWithPath(fullPath: string, pathSegment: string, exact: boolean) {
  if (exact) return fullPath === pathSegment;

  return (
    fullPath.startsWith(pathSegment) &&
    (fullPath.length === pathSegment.length ||
      fullPath[pathSegment.length] === '/')
  );
}

function splitUrl(
  url: URL,
  // prefix?: Prefix,
  consumed = '',
) {
  // const resolvedPrefix = extractPrefix(url, prefix) ?? '';
  // const fullConsumedPath = consumed
  //   ? `${resolvedPrefix}${consumed}`
  //   : resolvedPrefix;
  const pathname = removePostfixSlash(url.pathname);
  const remainderAbsolute =
    consumed === pathname ? '/' : pathname.replace(consumed, '');

  return {
    isRoot: consumed.length === 0,
    // prefix: resolvedPrefix,
    previouslyConsumed: consumed,
    remainderRelative: remainderAbsolute.slice(1),
    remainderAbsolute: remainderAbsolute,
  };
}

function removePrefixSlash(path: string) {
  return path[0] === '/' ? path.slice(1) : path;
}