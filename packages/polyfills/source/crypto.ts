import {Crypto} from '@peculiar/webcrypto';

const crypto = new Crypto();

Reflect.defineProperty(globalThis, 'crypto', {value: crypto});

export {};
