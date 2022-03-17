import type {Match} from '@quilted/routing';
import type {
  Headers,
  ReadonlyCookies,
  ReadonlyHeaders,
  WritableCookies,
} from '@quilted/http';

export interface RequestOptions {
  readonly url: URL | string;
  readonly body?: string | null;
  readonly method?: string;
  readonly headers?: ReadonlyHeaders;
}

export interface Request {
  readonly url: URL;
  readonly body?: string | null;
  readonly method: string;
  readonly headers: ReadonlyHeaders;
  readonly cookies: ReadonlyCookies;
}

export interface CookieDefinition {
  path?: string;
  domain?: string;
  maxAge?: number;
  expires?: Date;
  sameSite?: 'lax' | 'strict' | 'none';
  secure?: boolean;
  httpOnly?: boolean;
}

export interface EnhancedWritableCookies extends WritableCookies {
  getAll(): string[] | undefined;
}

export interface Response {
  readonly body?: string;
  readonly status: number;
  readonly headers: Headers;
  readonly cookies: EnhancedWritableCookies;
}

export interface ResponseOptions {
  status?: number;
  headers?: HeadersInit;
}

export type ValueOrPromise<T> = T | Promise<T>;

export interface RequestHandler {
  (request: Request): ValueOrPromise<Response | undefined | null>;
}

export type RequestRegistration = RequestHandler | HttpHandler;

export interface HttpHandler {
  any(handler: RequestRegistration): this;
  any(match: Match, handler: RequestRegistration): this;
  get(handler: RequestRegistration): this;
  get(match: Match, handler: RequestRegistration): this;
  post(handler: RequestRegistration): this;
  post(match: Match, handler: RequestRegistration): this;
  options(handler: RequestRegistration): this;
  options(match: Match, handler: RequestRegistration): this;
  run(request: RequestOptions): Promise<Response | undefined>;
}
