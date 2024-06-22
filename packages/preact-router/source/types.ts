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
  readonly input: Input;
  readonly data: Data;
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
          Omit<RouteNavigationStringEntry<unknown, unknown>, 'key' | 'load'>
        >,
      ) => unknown);
  input?: (
    entry: NoInfer<RouteNavigationStringEntry<unknown, unknown>>,
  ) => Input;
  load?: (
    entry: NoInfer<RouteNavigationStringEntry<unknown, Input>>,
  ) => Promise<Data>;
  render?:
    | ((
        children: ComponentChildren,
        entry: NoInfer<RouteNavigationStringEntry<Data, Input>>,
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
          Omit<RouteNavigationRegExpEntry<unknown, unknown>, 'key' | 'load'>
        >,
      ) => unknown);
  input?: (
    entry: NoInfer<RouteNavigationRegExpEntry<unknown, unknown>>,
  ) => Input;
  load?: (
    entry: NoInfer<RouteNavigationStringEntry<unknown, Input>>,
  ) => Promise<Data>;
  render?:
    | ((
        children: ComponentChildren,
        entry: NoInfer<RouteNavigationRegExpEntry<Data, Input>>,
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
        entry: Omit<
          RouteNavigationFallbackEntry<unknown, unknown>,
          'key' | 'load'
        >,
      ) => unknown);
  input?: (entry: RouteNavigationFallbackEntry<unknown, unknown>) => Input;
  load?: (
    entry: NoInfer<RouteNavigationStringEntry<unknown, Input>>,
  ) => Promise<Data>;
  render?:
    | ((
        children: ComponentChildren,
        entry: NoInfer<
          RouteNavigationFallbackEntry<NoInfer<Data>, NoInfer<Input>>
        >,
      ) => VNode<any>)
    | VNode<any>;
  children?: readonly RouteDefinition<any, any>[];
}

export type RouteDefinition<Data = unknown, Input = unknown> =
  | RouteDefinitionString<Data, Input>
  | RouteDefinitionRegExp<Data, Input>
  | RouteDefinitionFallback<Data, Input>;
