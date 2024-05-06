import {createOptionalContext} from '@quilted/preact-context';
import type {BrowserDetails} from '@quilted/browser';

export const BrowserDetailsContext = createOptionalContext<BrowserDetails>();
export const useBrowserDetails = BrowserDetailsContext.use;
