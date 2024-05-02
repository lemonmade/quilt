import {isSignal, type ReadonlySignal} from '@quilted/signals';
import type {BrowserHTMLAttributes} from '@quilted/browser';
import {useBrowserEffect} from './browser-effect.ts';

/**
 * Sets the provided attributes on the `<html>` element.
 */
export function useHTMLAttributes(
  htmlAttributes:
    | false
    | null
    | undefined
    | Partial<BrowserHTMLAttributes>
    | ReadonlySignal<BrowserHTMLAttributes>,
) {
  useBrowserEffect(
    (browser) => {
      if (htmlAttributes) return browser.htmlAttributes.add(htmlAttributes);
    },
    [
      isSignal(htmlAttributes) || !htmlAttributes
        ? htmlAttributes
        : JSON.stringify(htmlAttributes),
    ],
  );
}
