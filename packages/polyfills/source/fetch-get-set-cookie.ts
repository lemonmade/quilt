import {Headers} from 'headers-polyfill';

Reflect.defineProperty(globalThis, 'Headers', {value: Headers});

export {};
