import {Crypto} from '@peculiar/webcrypto';

if (typeof globalThis.crypto === 'undefined') {
  const crypto = new Crypto();

  Reflect.defineProperty(globalThis, 'crypto', {value: crypto});
}

export {};
