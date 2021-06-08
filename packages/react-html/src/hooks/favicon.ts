import {useDomEffect} from './dom-effect';

export interface FaviconOptions {
  type?: string;
}

export function useFavicon(source: string, {type}: FaviconOptions = {}) {
  useDomEffect(
    (manager) =>
      manager.addLink({
        rel: 'icon',
        type,
        href: source,
      }),
    [source],
  );
}
