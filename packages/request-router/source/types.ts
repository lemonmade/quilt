import type {NavigateToLiteral} from '@quilted/routing';
import type {WritableCookies} from '@quilted/http';

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
