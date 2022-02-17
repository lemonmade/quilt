import type {Match, EnhancedURL} from '@quilted/routing';
import type {Headers, ReadonlyHeaders} from '@quilted/http';

export interface RequestOptions {
  readonly url: URL | string;
  readonly body?: string | null;
  readonly method?: string;
  readonly headers?: ReadonlyHeaders;
}

export interface Request {
  readonly url: EnhancedURL;
  readonly body?: string | null;
  readonly method: string;
  readonly headers: ReadonlyHeaders;
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

export interface Response {
  readonly body?: string;
  readonly status: number;
  readonly headers: Headers;
}

export interface ResponseOptions {
  status?: number;
  headers?: HeadersInit;
}

export type ValueOrPromise<T> = T | Promise<T>;

export interface RequestHandler {
  (request: Request): ValueOrPromise<Response | undefined | null>;
}

export interface HttpHandler {
  any(handler: RequestHandler): void;
  any(match: Match, handler: RequestHandler): void;
  get(handler: RequestHandler): void;
  get(match: Match, handler: RequestHandler): void;
  post(handler: RequestHandler): void;
  post(match: Match, handler: RequestHandler): void;
  options(handler: RequestHandler): void;
  options(match: Match, handler: RequestHandler): void;
  run(request: RequestOptions): Promise<Response | undefined>;
}
