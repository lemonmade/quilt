import {useDomEffect} from './dom-effect';

export interface FaviconOptions {
  type?: string;
}

export function useFavicon(source: string, {type}: FaviconOptions = {}) {
  // <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='0.9em' font-size='90'>😀</text></svg>" />

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
