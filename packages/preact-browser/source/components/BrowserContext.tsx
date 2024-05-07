import type {RenderableProps} from 'preact';
import type {BrowserDetails} from '@quilted/browser';
import {BrowserDetailsContext} from '../context.ts';

/**
 * Provides details about the browser to your React app.
 */
export function BrowserContext({
  browser,
  children,
}: RenderableProps<{browser: BrowserDetails}>) {
  return (
    <BrowserDetailsContext.Provider value={browser}>
      {children}
    </BrowserDetailsContext.Provider>
  );
}
