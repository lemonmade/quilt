import type {PropsWithChildren} from 'react';

import {HttpContext, CookieContext} from '@quilted/react-http';
import {useHTMLUpdater} from '@quilted/react-html';

export interface HTMLProps {}

export function HTML({children}: PropsWithChildren<HTMLProps>) {
  return (
    <HttpContext>
      <CookieContext>
        <HTMLUpdater />
        {children}
      </CookieContext>
    </HttpContext>
  );
}

function HTMLUpdater() {
  useHTMLUpdater();
  return null;
}
