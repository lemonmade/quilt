import type {Match, NavigateToLiteral} from '@quilted/routing';
import type {
  Headers,
  ReadonlyCookies,
  ReadonlyHeaders,
  WritableCookies,
} from '@quilted/http';

export type NavigateTo = NavigateToLiteral | ((url: URL) => URL);

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

export interface RequestContext {}

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
  (request: Request, context: RequestContext): ValueOrPromise<
    Response | undefined | null
  >;
}

export type RequestRegistration = RequestHandler | HttpHandler;

export interface RequestRegistrationOptions {
  exact?: boolean;
}

export interface HttpHandler {
  any(handler: RequestRegistration, options?: RequestRegistrationOptions): this;
  any(
    match: Match,
    handler: RequestRegistration,
    options?: RequestRegistrationOptions,
  ): this;
  get(handler: RequestRegistration, options?: RequestRegistrationOptions): this;
  get(
    match: Match,
    handler: RequestRegistration,
    options?: RequestRegistrationOptions,
  ): this;
  post(
    handler: RequestRegistration,
    options?: RequestRegistrationOptions,
  ): this;
  post(
    match: Match,
    handler: RequestRegistration,
    options?: RequestRegistrationOptions,
  ): this;
  options(
    handler: RequestRegistration,
    options?: RequestRegistrationOptions,
  ): this;
  options(
    match: Match,
    handler: RequestRegistration,
    options?: RequestRegistrationOptions,
  ): this;
  run(
    request: RequestOptions,
    context?: RequestContext,
  ): Promise<Response | undefined>;
}
