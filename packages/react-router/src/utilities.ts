import type {Match, EnhancedURL, Prefix} from './types';

export function postfixSlash(path: string) {
  if (path.length === 0) return '/';
  return path.lastIndexOf('/') === path.length - 1 ? path : `${path}/`;
}

export function resolveMatch(
  url: Omit<EnhancedURL, 'state' | 'key' | 'normalizedPath'>,
  match: Match,
) {
  if (typeof match === 'string') {
    const pathname = remainder(url.pathname, url.prefix);
    return match === pathname || (pathname !== '/' && match === `${pathname}/`);
  } else if (match instanceof RegExp) {
    const pathname = remainder(url.pathname, url.prefix);
    return (
      match.test(pathname) || (pathname !== '/' && match.test(`${pathname}/`))
    );
  } else {
    return match(url);
  }
}

function removePostfixSlash(path: string) {
  return path[path.length - 1] === '/' ? path.slice(0, -1) : path;
}

function remainder(pathname: string, prefix?: string) {
  return prefix
    ? removePostfixSlash(pathname.replace(prefix, ''))
    : removePostfixSlash(pathname);
}

export function containedByPrefix(url: URL, prefix?: Prefix) {
  return extractPrefix(url, prefix) != null;
}

export function extractPrefix(url: URL, prefix?: Prefix) {
  if (!prefix) return undefined;

  if (typeof prefix === 'string') {
    return url.pathname.indexOf(prefix) === 0 ? prefix : undefined;
  }

  const regex = new RegExp(prefix.source);
  const match = regex.exec(url.pathname);
  return match != null && match.index === 0 ? match[0] : undefined;
}
