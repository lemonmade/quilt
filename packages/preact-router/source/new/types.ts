import type {ComponentChildren} from 'preact';
import type {AsyncAction} from '@quilted/async';
import type {NavigateTo} from '@quilted/routing';

export interface NavigationRequest {
  readonly id: string;
  readonly url: URL;
  // TODO: custom `baseURL`
  // readonly relativeURL: URL;
  readonly state: {[key: string]: unknown};
}

export interface RouteNavigationEntryBase<Data = unknown, Input = unknown> {
  readonly request: NavigationRequest;
  readonly key: unknown;
  readonly consumed?: string;
  readonly load?: AsyncAction<Data, Input>;
  readonly parent?: RouteNavigationEntry;
}

export interface RouteNavigationStringEntry<Data = unknown, Input = unknown>
  extends RouteNavigationEntryBase<Data, Input> {
  readonly matched: string;
  readonly route: RouteDefinitionString<Data, Input>;
}

export interface RouteNavigationRegExpEntry<Data = unknown, Input = unknown>
  extends RouteNavigationEntryBase<Data, Input> {
  readonly matched: RegExpMatchArray;
  readonly route: RouteDefinitionRegExp<Data, Input>;
}

export type RouteNavigationEntry<Data = unknown, Input = unknown> =
  | RouteNavigationStringEntry<Data, Input>
  | RouteNavigationRegExpEntry<Data, Input>;

export interface RouteDefinitionString<Data = unknown, Input = unknown> {
  match?: string | string[];
  exact?: boolean;
  redirect?: NavigateTo;
  key?:
    | string
    | readonly unknown[]
    | ((
        entry: Omit<RouteNavigationStringEntry<Data, Input>, 'key' | 'load'>,
      ) => unknown);
  input?: (
    entry: Omit<RouteNavigationStringEntry<Data, Input>, 'load'>,
  ) => Input;
  load?: (entry: RouteNavigationStringEntry<Data, Input>) => Promise<Data>;
  render?:
    | ComponentChildren
    | ((
        entry: RouteNavigationStringEntry<Data, Input> & {data: Data},
      ) => ComponentChildren);
  children?: readonly RouteDefinition[];
}

export interface RouteDefinitionRegExp<Data = unknown, Input = unknown> {
  match?: RegExp | RegExp[];
  exact?: boolean;
  redirect?: NavigateTo;
  key?:
    | string
    | readonly unknown[]
    | ((
        entry: Omit<RouteNavigationRegExpEntry<Data, Input>, 'key' | 'load'>,
      ) => unknown);
  input?: (
    entry: Omit<RouteNavigationRegExpEntry<Data, Input>, 'load'>,
  ) => Input;
  load?: (entry: RouteNavigationRegExpEntry<Data, Input>) => Promise<Data>;
  render?:
    | ComponentChildren
    | ((
        entry: RouteNavigationRegExpEntry<Data, Input> & {data: Data},
      ) => ComponentChildren);
  children?: readonly RouteDefinition[];
}

export type RouteDefinition<Data = unknown, Input = unknown> =
  | RouteDefinitionString<Data, Input>
  | RouteDefinitionRegExp<Data, Input>;
