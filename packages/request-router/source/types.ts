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

export interface RequestHandler<Context = RequestContext> {
  (request: EnhancedRequest, context: Context): ValueOrPromise<
    Response | EnhancedResponse | undefined | null
  >;
}

export type RequestRegistration<Context = RequestContext> =
  | RequestHandler<Context>
  | RequestRouter<Context>;

export interface RequestRegistrationOptions {
  exact?: boolean;
}

export interface RequestRouter<Context = RequestContext> {
  any(
    handler: RequestRegistration<Context>,
    options?: RequestRegistrationOptions,
  ): this;
  any(
    match: Match,
    handler: RequestRegistration<Context>,
    options?: RequestRegistrationOptions,
  ): this;
  head(
    handler: RequestRegistration<Context>,
    options?: RequestRegistrationOptions,
  ): this;
  head(
    match: Match,
    handler: RequestRegistration<Context>,
    options?: RequestRegistrationOptions,
  ): this;
  get(
    handler: RequestRegistration<Context>,
    options?: RequestRegistrationOptions,
  ): this;
  get(
    match: Match,
    handler: RequestRegistration<Context>,
    options?: RequestRegistrationOptions,
  ): this;
  post(
    handler: RequestRegistration<Context>,
    options?: RequestRegistrationOptions,
  ): this;
  post(
    match: Match,
    handler: RequestRegistration<Context>,
    options?: RequestRegistrationOptions,
  ): this;
  options(
    handler: RequestRegistration<Context>,
    options?: RequestRegistrationOptions,
  ): this;
  options(
    match: Match,
    handler: RequestRegistration<Context>,
    options?: RequestRegistrationOptions,
  ): this;
  put(
    handler: RequestRegistration<Context>,
    options?: RequestRegistrationOptions,
  ): this;
  put(
    match: Match,
    handler: RequestRegistration<Context>,
    options?: RequestRegistrationOptions,
  ): this;
  patch(
    handler: RequestRegistration<Context>,
    options?: RequestRegistrationOptions,
  ): this;
  patch(
    match: Match,
    handler: RequestRegistration<Context>,
    options?: RequestRegistrationOptions,
  ): this;
  delete(
    handler: RequestRegistration<Context>,
    options?: RequestRegistrationOptions,
  ): this;
  delete(
    match: Match,
    handler: RequestRegistration<Context>,
    options?: RequestRegistrationOptions,
  ): this;
  connect(
    handler: RequestRegistration<Context>,
    options?: RequestRegistrationOptions,
  ): this;
  connect(
    match: Match,
    handler: RequestRegistration<Context>,
    options?: RequestRegistrationOptions,
  ): this;
  run(
    request: Request,
    context?: RequestContext,
  ): Promise<
    (Response & {readonly cookies?: EnhancedResponse['cookies']}) | undefined
  >;
}
