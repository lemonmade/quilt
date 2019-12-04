import {Match} from './types';

export function resolveMatch(url: URL, match: Match) {
  if (typeof match === 'string') {
    return url.pathname === match || url.pathname === `${match}/`;
  } else if (match instanceof RegExp) {
    return match.test(url.pathname);
  } else {
    return match(url);
  }
}
