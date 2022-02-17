import {createContext} from 'react';
import type {ReadonlyHeaders} from '@quilted/http';

import type {HttpManager} from './manager';
import type {Cookies} from './types';

export const HttpServerContext = createContext<HttpManager | null>(null);
export const HttpAppContext = createContext<{
  readonly cookies: Cookies;
  readonly headers: ReadonlyHeaders;
} | null>(null);
