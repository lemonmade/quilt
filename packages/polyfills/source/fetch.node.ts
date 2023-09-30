import {fetch, Response, Request} from '@remix-run/web-fetch';
import {Headers} from 'headers-polyfill';

if (!Reflect.has(globalThis, 'fetch')) {
  Reflect.defineProperty(globalThis, 'fetch', {value: fetch});
  Reflect.defineProperty(globalThis, 'Response', {value: Response});
  Reflect.defineProperty(globalThis, 'Request', {value: Request});
}

Reflect.defineProperty(globalThis, 'Headers', {value: Headers});

export {};
