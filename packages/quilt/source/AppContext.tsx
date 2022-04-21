import type {PropsWithChildren} from 'react';

import {HttpContext, CookieContext} from '@quilted/react-http';
import {useHtmlUpdater} from '@quilted/react-html';
import type {Performance} from '@quilted/react-performance';

interface Props {
  performance?: Performance;
}

// TODO: have craft options to remove the bundle impact of parts of this that are
// unused.
export function AppContext({children}: PropsWithChildren<Props>) {
  useHtmlUpdater();

  return (
    <HttpContext>
      <CookieContext>{children}</CookieContext>
    </HttpContext>
  );
}
