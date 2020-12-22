import {createContext} from 'react';
import type {HttpManager} from './manager';
import type {ReadonlyHeaders} from './types';

export const HttpContext = createContext<HttpManager | null>(null);
export const HeadersContext = createContext<ReadonlyHeaders | null>(null);
