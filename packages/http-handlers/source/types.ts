import type {Match, NavigateToLiteral} from '@quilted/routing';
import type {WritableCookies} from '@quilted/http';
import type {EnhancedResponse} from './response';
import type {EnhancedRequest} from './request';

export type NavigateTo = NavigateToLiteral | ((url: URL) => URL);

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

export type ValueOrPromise<T> = T | Promise<T>;

export interface RequestHandler {
  (request: EnhancedRequest, context: RequestContext): ValueOrPromise<
    Response | EnhancedResponse | undefined | null
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
  head(
    handler: RequestRegistration,
    options?: RequestRegistrationOptions,
  ): this;
  head(
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
  put(handler: RequestRegistration, options?: RequestRegistrationOptions): this;
  put(
    match: Match,
    handler: RequestRegistration,
    options?: RequestRegistrationOptions,
  ): this;
  patch(
    handler: RequestRegistration,
    options?: RequestRegistrationOptions,
  ): this;
  patch(
    match: Match,
    handler: RequestRegistration,
    options?: RequestRegistrationOptions,
  ): this;
  delete(
    handler: RequestRegistration,
    options?: RequestRegistrationOptions,
  ): this;
  delete(
    match: Match,
    handler: RequestRegistration,
    options?: RequestRegistrationOptions,
  ): this;
  connect(
    handler: RequestRegistration,
    options?: RequestRegistrationOptions,
  ): this;
  connect(
    match: Match,
    handler: RequestRegistration,
    options?: RequestRegistrationOptions,
  ): this;
  run(
    request: Request,
    context?: RequestContext,
  ): Promise<
    (Response & {readonly cookies?: EnhancedResponse['cookies']}) | undefined
  >;
}
