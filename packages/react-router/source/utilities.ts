import {enhanceUrl as baseEnhancedURL} from '@quilted/routing';
import type {Prefix} from '@quilted/routing';

import type {EnhancedURL} from './types';

export function enhanceUrl(
  url: URL,
  state: Record<string, any>,
  key: string,
  prefix?: Prefix,
): EnhancedURL {
  Object.defineProperty(url, 'state', {
    value: state,
    writable: false,
  });

  Object.defineProperty(url, 'key', {
    value: key,
    writable: false,
  });

  return baseEnhancedURL(url, prefix) as EnhancedURL;
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
