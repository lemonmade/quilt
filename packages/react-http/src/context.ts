import {createContext} from 'react';
import type {Cookies, ReadonlyHeaders} from '@quilted/http';

import type {HttpManager} from './manager';

export const HttpServerContext = createContext<HttpManager | null>(null);
export const HttpAppContext = createContext<{
  readonly cookies: Cookies;
  readonly headers: ReadonlyHeaders;
} | null>(null);
