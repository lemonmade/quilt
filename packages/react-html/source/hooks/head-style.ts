/* eslint react-hooks/exhaustive-deps: off */

import type {HTMLProps} from 'react';
import {useDomEffect} from './dom-effect.ts';

/**
 * Adds a stylesheet `<link>` tag to the `<head>` of the document with the
 * provided attributes. If you want to conditionally disable or
 * remove the tag, you can instead pass `false` to this hook.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link
 */
export function useHeadStyle(
  link: false | null | undefined | string | HTMLProps<HTMLLinkElement>,
) {
  useDomEffect(
    (manager) => {
      if (link) {
        return manager.addLink({
          rel: 'stylesheet',
          ...(typeof link === 'string' ? {href: link} : link),
        });
      }
    },
    [link && (typeof link === 'string' ? link : JSON.stringify(link))],
  );
}
