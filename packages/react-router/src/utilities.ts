import {Match, EnhancedURL} from './types';

export function postfixSlash(path: string) {
  if (path.length === 0) return '/';
  return path.lastIndexOf('/') === path.length - 1 ? path : `${path}/`;
}

export function resolveMatch(url: Omit<EnhancedURL, 'state'>, match: Match) {
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
