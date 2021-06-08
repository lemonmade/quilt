import {useDomEffect} from './dom-effect';

interface Options {
  coverNotch?: boolean;
}

export function useViewport({coverNotch = true}: Options) {
  useDomEffect(
    (manager) => {
      const parts = [
        'width=device-width, initial-scale=1.0, height=device-height',
      ];

      if (coverNotch) parts.push('viewport-fit=cover');

      return manager.addMeta({
        name: 'viewport',
        content: parts.join(', '),
      });
    },
    [coverNotch],
  );
}
