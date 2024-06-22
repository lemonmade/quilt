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
  readonly route: RouteDefinitionString<NoInfer<Data>, NoInfer<Input>>;
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
        entry: Omit<
          RouteNavigationStringEntry<NoInfer<Data>, NoInfer<Input>>,
          'key' | 'load'
        >,
      ) => unknown);
  input?: (
    entry: NoInfer<RouteNavigationStringEntry<NoInfer<Data>, NoInfer<Input>>>,
  ) => Input;
  load?: (
    input: NoInfer<Input>,
    entry: RouteNavigationStringEntry<NoInfer<Data>, NoInfer<Input>>,
  ) => Promise<Data>;
  render?:
    | ((
        entry: RouteNavigationStringEntry<NoInfer<Data>, NoInfer<Input>> & {
          data: NoInfer<Data>;
          children?: ComponentChildren;
        },
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
        entry: Omit<
          RouteNavigationRegExpEntry<NoInfer<Data>, NoInfer<Input>>,
          'key' | 'load'
        >,
      ) => unknown);
  input?: (
    entry: RouteNavigationRegExpEntry<NoInfer<Data>, NoInfer<Input>>,
  ) => Input;
  load?: (
    input: NoInfer<Input>,
    entry: RouteNavigationStringEntry<NoInfer<Data>, NoInfer<Input>>,
  ) => Promise<Data>;
  render?:
    | ((
        entry: RouteNavigationRegExpEntry<NoInfer<Data>, NoInfer<Input>> & {
          data: NoInfer<Data>;
          children?: ComponentChildren;
        },
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
          RouteNavigationFallbackEntry<NoInfer<Data>, NoInfer<Input>>,
          'key' | 'load'
        >,
      ) => unknown);
  input?: (
    entry: RouteNavigationFallbackEntry<NoInfer<Data>, NoInfer<Input>>,
  ) => Input;
  load?: (
    input: NoInfer<Input>,
    entry: RouteNavigationStringEntry<NoInfer<Data>, NoInfer<Input>>,
  ) => Promise<Data>;
  render?:
    | ((
        entry: RouteNavigationFallbackEntry<NoInfer<Data>, NoInfer<Input>> & {
          data: NoInfer<Data>;
          children?: ComponentChildren;
        },
      ) => VNode<any>)
    | VNode<any>;
  children?: readonly RouteDefinition<any, any>[];
}

export type RouteDefinition<Data = unknown, Input = unknown> =
  | RouteDefinitionString<Data, Input>
  | RouteDefinitionRegExp<Data, Input>
  | RouteDefinitionFallback<Data, Input>;
