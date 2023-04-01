/* eslint react-hooks/exhaustive-deps: off */

import type {HTMLProps} from 'react';
import {useDomEffect} from './dom-effect.ts';

/**
 * Adds a `<meta>` tag to the `<head>` of the document with the
 * provided attributes. If you want to conditionally disable or
 * remove the tag, you can instead pass `false` to this hook.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta
 */
export function useMeta(meta: false | HTMLProps<HTMLMetaElement>) {
  useDomEffect(
    (manager) => {
      if (meta) return manager.addMeta(meta);
    },
    [meta && JSON.stringify(meta)],
  );
}
