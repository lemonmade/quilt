import {isSignal, type ReadonlySignal} from '@quilted/signals';
import type {BrowserBodyAttributes} from '@quilted/browser';
import {useBrowserEffect} from './browser-effect.ts';

/**
 * Sets the provided attributes on the `<body>` element.
 */
export function useBodyAttributes(
  bodyAttributes:
    | false
    | null
    | undefined
    | Partial<BrowserBodyAttributes>
    | ReadonlySignal<BrowserBodyAttributes>,
) {
  useBrowserEffect(
    (browser) => {
      if (bodyAttributes) return browser.bodyAttributes.add(bodyAttributes);
    },
    [
      isSignal(bodyAttributes) || !bodyAttributes
        ? bodyAttributes
        : JSON.stringify(bodyAttributes),
    ],
  );
}
