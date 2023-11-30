import type {HTMLProps} from 'react';
import {useDomEffect} from './dom-effect.ts';

/**
 * Adds a `<link>` tag to the `<head>` of the document with the
 * provided attributes. If you want to conditionally disable or
 * remove the tag, you can instead pass `false` to this hook.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link
 */
export function useLink(
  link: false | null | undefined | HTMLProps<HTMLLinkElement>,
) {
  useDomEffect(
    (manager) => {
      if (link) return manager.addLink(link);
    },
    [link && JSON.stringify(link)],
  );
}
