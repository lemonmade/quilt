import type {ComponentChildren, VNode} from 'preact';
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

export interface RouteNavigationFallbackEntry<Data = unknown, Input = unknown>
  extends RouteNavigationEntryBase<Data, Input> {
  readonly matched: string;
  readonly route: RouteDefinitionFallback<Data, Input>;
}

export type RouteNavigationEntry<Data = unknown, Input = unknown> =
  | RouteNavigationStringEntry<Data, Input>
  | RouteNavigationRegExpEntry<Data, Input>
  | RouteNavigationFallbackEntry<Data, Input>;

export interface RouteDefinitionString<Data = unknown, Input = unknown> {
  match: string | string[];
  exact?: boolean;
  redirect?: NavigateTo;
  key?:
    | string
    | readonly unknown[]
    | ((
        entry: NoInfer<
          Omit<RouteNavigationStringEntry<Data, Input>, 'key' | 'load'>
        >,
      ) => unknown);
  input?: (
    entry: NoInfer<Omit<RouteNavigationStringEntry<Data, Input>, 'load'>>,
  ) => Input;
  load?: (entry: RouteNavigationStringEntry<Data, Input>) => Promise<Data>;
  render?:
    | ((
        entry: NoInfer<
          RouteNavigationStringEntry<Data, Input> & {
            data: Data;
            children?: ComponentChildren;
          }
        >,
      ) => VNode<any>)
    | VNode<any>;
  children?: readonly RouteDefinition<any, any>[];
}

export interface RouteDefinitionRegExp<Data = unknown, Input = unknown> {
  match: RegExp | RegExp[];
  exact?: boolean;
  redirect?: NavigateTo;
  key?:
    | string
    | readonly unknown[]
    | ((
        entry: NoInfer<
          Omit<RouteNavigationRegExpEntry<Data, Input>, 'key' | 'load'>
        >,
      ) => unknown);
  input?: (
    entry: NoInfer<Omit<RouteNavigationRegExpEntry<Data, Input>, 'load'>>,
  ) => Input;
  load?: (entry: RouteNavigationRegExpEntry<Data, Input>) => Promise<Data>;
  render?:
    | ((
        entry: NoInfer<
          RouteNavigationRegExpEntry<Data, Input> & {
            data: Data;
            children?: ComponentChildren;
          }
        >,
      ) => VNode<any>)
    | VNode<any>;
  children?: readonly RouteDefinition<any, any>[];
}

export interface RouteDefinitionFallback<Data = unknown, Input = unknown> {
  match?: '*' | true;
  exact?: boolean;
  redirect?: NavigateTo;
  key?:
    | string
    | readonly unknown[]
    | ((
        entry: NoInfer<
          Omit<RouteNavigationFallbackEntry<Data, Input>, 'key' | 'load'>
        >,
      ) => unknown);
  input?: (
    entry: NoInfer<Omit<RouteNavigationFallbackEntry<Data, Input>, 'load'>>,
  ) => Input;
  load?: (entry: RouteNavigationFallbackEntry<Data, Input>) => Promise<Data>;
  render?:
    | ((
        entry: NoInfer<
          RouteNavigationFallbackEntry<Data, Input> & {
            data: Data;
            children?: ComponentChildren;
          }
        >,
      ) => VNode<any>)
    | VNode<any>;
  children?: readonly RouteDefinition<any, any>[];
}

export type RouteDefinition<Data = unknown, Input = unknown> =
  | RouteDefinitionString<Data, Input>
  | RouteDefinitionRegExp<Data, Input>
  | RouteDefinitionFallback<Data, Input>;
