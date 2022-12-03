import {AbortController, AbortSignal} from 'abort-controller';

if (typeof globalThis.AbortController === 'undefined') {
  Reflect.defineProperty(globalThis, 'AbortController', {
    value: AbortController,
  });
  Reflect.defineProperty(globalThis, 'AbortSignal', {value: AbortSignal});
}
