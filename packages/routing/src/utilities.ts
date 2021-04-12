import type {
  Prefix,
  EnhancedURL,
  NavigateTo,
  Search,
  RelativeTo,
} from './types';

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

export function resolveUrl(
  to: NavigateTo,
  from: EnhancedURL,
  relativeTo?: RelativeTo,
): URL {
  const prefix = relativeTo === 'root' ? '/' : from.prefix;

  if (to instanceof URL) {
    if (to.origin !== from.origin) {
      throw new Error(
        `You can’t perform a client side navigation to ${to.href} from ${from.href}`,
      );
    }

    return to;
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

function urlToPostfixedOriginAndPath(url: URL) {
  return postfixSlash(`${url.origin}${url.pathname}`);
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
    ? removePostfixSlash(match[0])
    : undefined;
}
