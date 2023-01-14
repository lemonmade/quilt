import {createOptionalContext} from '@quilted/react-utilities';
import type {ReadonlyHeaders, Cookies} from '@quilted/http';

import type {HttpManager} from './manager';

export const HttpServerContext = createOptionalContext<HttpManager>();
export const HttpCookiesContext = createOptionalContext<Cookies>();
export const HttpHeadersContext = createOptionalContext<ReadonlyHeaders>();
