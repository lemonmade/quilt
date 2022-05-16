import {AbortController} from 'abort-controller';

Reflect.defineProperty(globalThis, 'AbortController', {value: AbortController});
