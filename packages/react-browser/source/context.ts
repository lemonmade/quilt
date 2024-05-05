import {
  createOptionalContext,
  createUseContextHook,
} from '@quilted/react-utilities';
import type {BrowserDetails} from '@quilted/browser';

export const BrowserDetailsContext = createOptionalContext<BrowserDetails>();
export const useBrowserDetails = createUseContextHook(BrowserDetailsContext);
