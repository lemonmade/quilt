import type {HTMLProps} from 'react';
import {useDomEffect} from './dom-effect.ts';

/**
 * Adds a `<script>` tag to the `<head>` of the document with the
 * provided attributes. If you want to conditionally disable or
 * remove the tag, you can instead pass `false` to this hook.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script
 */
export function useHeadScript(
  script: false | null | undefined | string | HTMLProps<HTMLScriptElement>,
) {
  useDomEffect(
    (manager) => {
      if (script) {
        return manager.addScript(
          typeof script === 'string' ? {src: script} : script,
        );
      }
    },
    [script && (typeof script === 'string' ? script : JSON.stringify(script))],
  );
}
