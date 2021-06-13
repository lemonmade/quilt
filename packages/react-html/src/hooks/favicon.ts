import {useDomEffect} from './dom-effect';

export interface FaviconOptions {
  type?: string;
}

export function useFavicon(source: string, {type}: FaviconOptions = {}) {
  useDomEffect(
    (manager) =>
      manager.addLink(
        type
          ? {
              rel: 'icon',
              type,
              href: source,
            }
          : {rel: 'icon', href: source},
      ),
    [source],
  );
}
