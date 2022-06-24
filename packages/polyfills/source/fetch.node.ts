import {fetch, Response, Request, Headers} from '@remix-run/web-fetch';

if (!Reflect.has(globalThis, 'fetch')) {
  Reflect.defineProperty(globalThis, 'fetch', {value: fetch});
  Reflect.defineProperty(globalThis, 'Response', {value: Response});
  Reflect.defineProperty(globalThis, 'Headers', {value: Headers});
  Reflect.defineProperty(globalThis, 'Request', {value: Request});
}

export {};
