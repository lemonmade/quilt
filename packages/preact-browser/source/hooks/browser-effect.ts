import {useEffect} from 'preact/hooks';
import type {BrowserDetails} from '@quilted/browser';

import {useBrowserDetails} from '../context.ts';

const EMPTY_DEPENDENCIES = Object.freeze([]);

export function useBrowserEffect(
  perform: (browser: BrowserDetails) => void | (() => void),
  dependencies: readonly any[] = EMPTY_DEPENDENCIES,
) {
  const browser = useBrowserDetails();

  if (typeof document === 'undefined') {
    perform(browser);
    return;
  }

  useEffect(() => {
    return perform(browser);
  }, [browser, ...dependencies]);
}
