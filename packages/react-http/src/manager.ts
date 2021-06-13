import type {StatusCode, CspDirective} from '@quilted/http';
import type {ServerActionKind} from '@quilted/react-server-render';

import type {ReadonlyHeaders} from './types';
import {SERVER_ACTION_ID} from './constants';

interface Options {
  headers?: Record<string, string> | Map<string, string> | Headers;
  // cookies?: Cookie | string;
}

export class HttpManager {
  readonly actionKind: ServerActionKind = {
    id: SERVER_ACTION_ID,
    afterEachPass: () => {
      return this.redirectUrl == null;
    },
    betweenEachPass: () => {
      this.reset();
    },
  };

  readonly headers: ReadonlyHeaders;
  readonly persistedHeaders = new Set<string>();
  private statusCodes: StatusCode[] = [];
  private redirectUrl?: string;
  private readonly csp = new Map<CspDirective, string[] | boolean>();
  private readonly responseHeaders = new Map<string, string>([
    ['content-type', 'text/html'],
  ]);

  constructor({headers}: Options = {}) {
    this.headers = normalizeHeaders(headers);
  }

  reset() {
    this.statusCodes = [];
    this.csp.clear();
    this.responseHeaders.clear();
    this.redirectUrl = undefined;
  }

  persistHeader(header: string) {
    this.persistedHeaders.add(header.toLowerCase());
  }

  setHeader(header: string, value: string) {
    this.responseHeaders.set(header.toLowerCase(), value);
  }

  redirectTo(url: string, statusCode: StatusCode = 302) {
    this.addStatusCode(statusCode);
    this.redirectUrl = url;
  }

  addStatusCode(statusCode: StatusCode) {
    this.statusCodes.push(statusCode);
  }

  addCspDirective(directive: CspDirective, value: string | string[] | boolean) {
    const normalizedValue = typeof value === 'string' ? [value] : value;
    const currentValue = this.csp.get(directive) || [];
    const normalizedCurrentValue = Array.isArray(currentValue)
      ? currentValue
      : [String(currentValue)];

    const newValue = Array.isArray(normalizedValue)
      ? [...normalizedCurrentValue, ...normalizedValue]
      : normalizedValue;

    this.csp.set(directive, newValue);
  }

  get state() {
    const csp =
      this.csp.size === 0
        ? undefined
        : [...this.csp]
            .map(([key, value]) => {
              let printedValue: string;

              if (typeof value === 'boolean') {
                printedValue = '';
              } else if (typeof value === 'string') {
                printedValue = value;
              } else {
                printedValue = value.join(' ');
              }

              return `${key}${printedValue ? ' ' : ''}${printedValue}`;
            })
            .join('; ');

    const headers = new Map(this.responseHeaders);

    if (csp) {
      headers.set('content-security-policy', csp);
    }

    return {
      statusCode:
        this.statusCodes.length > 0 ? Math.max(...this.statusCodes) : undefined,
      headers,
      redirectUrl: this.redirectUrl,
    };
  }
}

function normalizeHeaders(headers: Options['headers']): Map<string, string> {
  if (!headers) {
    return new Map();
  }

  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    return new Map(
      [...headers.entries()].map(([header, value]) => [
        header.toLowerCase(),
        value,
      ]),
    );
  }

  if (headers instanceof Map) {
    return new Map(headers);
  }

  return new Map(
    Object.entries(headers).map(([header, value]) => [
      header.toLowerCase(),
      value,
    ]),
  );
}
