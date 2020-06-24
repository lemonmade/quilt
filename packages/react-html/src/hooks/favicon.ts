import {useDomEffect} from './dom-effect';

export function useFavicon(source: string) {
  useDomEffect(
    (manager) =>
      manager.addLink({
        rel: 'shortcut icon',
        type: 'image/x-icon',
        href: source,
      }),
    [source],
  );
}
