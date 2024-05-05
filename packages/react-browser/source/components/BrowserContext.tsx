import type {PropsWithChildren} from 'react';
import type {BrowserDetails} from '@quilted/browser';
import {BrowserDetailsContext} from '../context.ts';

/**
 * Provides details about the browser to your React app.
 */
export function BrowserContext({
  browser,
  children,
}: PropsWithChildren<{browser: BrowserDetails}>) {
  return (
    <BrowserDetailsContext.Provider value={browser}>
      {children}
    </BrowserDetailsContext.Provider>
  );
}
