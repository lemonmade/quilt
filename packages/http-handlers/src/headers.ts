// I used to use the Headers polyfill from node-fetch, but that brings
// in a bunch of node dependencies that we don’t want. This simplified
// implementation is based on https://github.com/github/fetch instead.

type InternalHeaders = Headers;

export type {InternalHeaders as Headers};

export function createHeaders(headers?: HeadersInit) {
  return new HeadersPolyfill(headers);
}

export class HeadersPolyfill implements Headers {
  private readonly normalized = new Map<string, string>();

  constructor(headers?: HeadersInit) {
    if (headers) {
      if (Symbol.iterator in headers) {
        for (const [header, value] of headers as Headers | [string, string][]) {
          this.append(header, value);
        }
      } else {
        for (const [header, value] of Object.entries(headers)) {
          this.append(header, value);
        }
      }
    }
  }

  append(header: string, value: string) {
    const normalizedHeader = normalizeHeader(header);

    const oldValue = this.normalized.get(normalizedHeader);
    this.normalized.set(
      normalizedHeader,
      oldValue
        ? `${oldValue}, ${normalizeValue(value)}`
        : normalizeValue(value),
    );
  }

  get(header: string) {
    return this.normalized.get(normalizeHeader(header)) ?? null;
  }

  has(header: string) {
    return this.normalized.has(normalizeHeader(header));
  }

  set(header: string, value: string) {
    this.normalized.set(normalizeHeader(header), normalizeValue(value));
  }

  delete(header: string) {
    this.normalized.delete(normalizeHeader(header));
  }

  keys() {
    return this.normalized.keys();
  }

  values() {
    return this.normalized.values();
  }

  entries() {
    return this.normalized.entries();
  }

  [Symbol.iterator]() {
    return this.entries();
  }

  forEach<T = undefined>(
    callback: (
      this: T,
      header: string,
      value: string,
      headers: Headers,
    ) => void,
    thisArg?: T,
  ) {
    for (const [header, value] of this.normalized) {
      callback.call(thisArg as any, header, value, this);
    }
  }
}

function normalizeHeader(name: string) {
  const stringyName = typeof name === 'string' ? name : String(name);

  if (/[^a-z0-9\-#$%&'*+.^_`|~!]/i.test(stringyName) || stringyName === '') {
    throw new TypeError(
      `Invalid character in header field name: ${JSON.stringify(name)}`,
    );
  }

  return stringyName.toLowerCase();
}

function normalizeValue(value: unknown) {
  return typeof value === 'string' ? value : String(value);
}
