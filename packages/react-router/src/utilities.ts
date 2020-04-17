import {Match, EnhancedURL} from './types';

export function postfixSlash(path: string) {
  if (path.length === 0) return '/';
  return path.lastIndexOf('/') === path.length - 1 ? path : `${path}/`;
}

export function resolveMatch(url: Omit<EnhancedURL, 'state'>, match: Match) {
  if (typeof match === 'string') {
    const pathname = remainder(url.pathname, url.prefix);
    return pathname === match || pathname === `${match}/`;
  } else if (match instanceof RegExp) {
    return match.test(remainder(url.pathname, url.prefix));
  } else {
    return match(url);
  }
}

function remainder(pathname: string, prefix?: string) {
  return prefix
    ? postfixSlash(pathname.replace(prefix, ''))
    : postfixSlash(pathname);
}
