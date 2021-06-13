// I used to use the Headers polyfill from node-fetch, but that brings
// in a bunch of node dependencies that we don’t want. This simplified
// implementation based on URLSearchParams (which is a global in all
// the environments we currently support) seems to do the trick, though!

type InternalHeaders = Headers;

export type {InternalHeaders as Headers};

export class HeadersPolyfill extends URLSearchParams implements Headers {
  get [Symbol.toStringTag]() {
    return 'Headers';
  }
}

export function createHeaders(headers?: HeadersInit) {
  return new HeadersPolyfill(headers as any);
}
