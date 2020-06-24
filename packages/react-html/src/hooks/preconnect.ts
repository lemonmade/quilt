import {useDomEffect} from './dom-effect';

export function usePreconnect(source: string) {
  useDomEffect(
    (manager) =>
      manager.addLink({
        rel: 'preconnect',
        href: source,
      }),
    [source],
  );
}
