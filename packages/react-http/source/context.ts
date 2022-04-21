import {createContext} from 'react';
import type {ReadonlyHeaders, Cookies} from '@quilted/http';

import type {HttpManager} from './manager';

export const HttpServerContext = createContext<HttpManager | null>(null);
export const HttpCookiesContext = createContext<Cookies | null>(null);
export const HttpHeadersContext = createContext<ReadonlyHeaders | null>(null);
