import type {ComponentChildren, VNode} from 'preact';
import type {AsyncAction} from '@quilted/async';
import type {NavigateTo} from '@quilted/routing';

export interface NavigationRequest {
  readonly id: string;
  readonly url: URL;
  readonly state: {[key: string]: unknown};
}

export interface RouteNavigationEntryBase<
  Data = unknown,
  Input = unknown,
  Context = unknown,
> {
  readonly id: string;
  readonly request: NavigationRequest;
  readonly key: unknown;
  readonly input: Input;
  readonly data: Data;
  readonly context: Context;
  readonly load?: AsyncAction<Data, Input>;
  readonly parent?: RouteNavigationEntry;
  readonly consumed?: string;
}

export interface RouteNavigationStringEntry<
  Data = unknown,
  Input = unknown,
  Context = unknown,
> extends RouteNavigationEntryBase<Data, Input, Context> {
  readonly matched: string;
  readonly route: RouteDefinitionString<Data, Input, Context>;
}

export interface RouteNavigationRegExpEntry<
  Data = unknown,
  Input = unknown,
  Context = unknown,
> extends RouteNavigationEntryBase<Data, Input, Context> {
  readonly matched: RegExpMatchArray;
  readonly route: RouteDefinitionRegExp<Data, Input, Context>;
}

export interface RouteNavigationFallbackEntry<
  Data = unknown,
  Input = unknown,
  Context = unknown,
> extends RouteNavigationEntryBase<Data, Input> {
  readonly matched: string;
  readonly route: RouteDefinitionFallback<Data, Input, Context>;
}

export type RouteNavigationEntry<
  Data = unknown,
  Input = unknown,
  Context = unknown,
> =
  | RouteNavigationStringEntry<Data, Input, Context>
  | RouteNavigationRegExpEntry<Data, Input, Context>
  | RouteNavigationFallbackEntry<Data, Input, Context>;

export interface RouteDefinitionString<
  Data = unknown,
  Input = unknown,
  Context = unknown,
> {
  match: string | string[];
  exact?: boolean;
  redirect?: NavigateTo;
  key?:
    | string
    | readonly unknown[]
    | ((
        navigation: NoInfer<
          Omit<
            RouteNavigationStringEntry<unknown, unknown, Context>,
            'id' | 'key' | 'load'
          >
        >,
      ) => unknown);
  input?: (
    navigation: NoInfer<RouteNavigationStringEntry<unknown, unknown, Context>>,
  ) => Input;
  load?: RouteDefinitionStringLoadFunction<Data, Input, Context>;
  render?:
    | ((
        children: ComponentChildren,
        navigation: NoInfer<RouteNavigationStringEntry<Data, Input, Context>>,
      ) => VNode<any>)
    | VNode<any>;
  children?: readonly RouteDefinition<any, any, Context>[];
}

export interface RouteDefinitionStringLoadFunction<
  Data = unknown,
  Input = unknown,
  Context = unknown,
> {
  (
    navigation: NoInfer<RouteNavigationStringEntry<unknown, Input, Context>>,
    context: Context,
  ): Promise<Data>;
}

export interface RouteDefinitionRegExp<
  Data = unknown,
  Input = unknown,
  Context = unknown,
> {
  match: RegExp | RegExp[];
  exact?: boolean;
  redirect?: NavigateTo;
  key?:
    | string
    | readonly unknown[]
    | ((
        navigation: NoInfer<
          Omit<
            RouteNavigationRegExpEntry<unknown, unknown, Context>,
            'key' | 'load'
          >
        >,
      ) => unknown);
  input?: (
    navigation: NoInfer<RouteNavigationRegExpEntry<unknown, unknown, Context>>,
  ) => Input;
  load?: RouteDefinitionRegExpLoadFunction<Data, Input, Context>;
  render?:
    | ((
        children: ComponentChildren,
        navigation: NoInfer<RouteNavigationRegExpEntry<Data, Input, Context>>,
      ) => VNode<any>)
    | VNode<any>;
  children?: readonly RouteDefinition<any, any, Context>[];
}

export interface RouteDefinitionRegExpLoadFunction<
  Data = unknown,
  Input = unknown,
  Context = unknown,
> {
  (
    navigation: RouteNavigationRegExpEntry<unknown, Input, Context>,
    context: Context,
  ): Promise<Data>;
}

export interface RouteDefinitionFallback<
  Data = unknown,
  Input = unknown,
  Context = unknown,
> {
  match?: '*' | true;
  exact?: boolean;
  redirect?: NavigateTo;
  key?:
    | string
    | readonly unknown[]
    | ((
        navigation: Omit<
          RouteNavigationFallbackEntry<unknown, unknown, Context>,
          'key' | 'load'
        >,
      ) => unknown);
  input?: (
    navigation: RouteNavigationFallbackEntry<unknown, unknown, Context>,
  ) => Input;
  load?: RouteDefinitionFallbackLoadFunction<Data, Input, Context>;
  render?:
    | ((
        children: ComponentChildren,
        navigation: NoInfer<RouteNavigationFallbackEntry<Data, Input, Context>>,
      ) => VNode<any>)
    | VNode<any>;
  children?: readonly RouteDefinition<any, any, Context>[];
}

export interface RouteDefinitionFallbackLoadFunction<
  Data = unknown,
  Input = unknown,
  Context = unknown,
> {
  (
    navigation: RouteNavigationFallbackEntry<unknown, Input, Context>,
    context: Context,
  ): Promise<Data>;
}

export type RouteDefinition<
  Data = unknown,
  Input = unknown,
  Context = unknown,
> =
  | RouteDefinitionString<Data, Input, Context>
  | RouteDefinitionRegExp<Data, Input, Context>
  | RouteDefinitionFallback<Data, Input, Context>;

export type RouteDefinitionLoadFunction<
  Data = unknown,
  Input = unknown,
  Context = unknown,
> =
  | RouteDefinitionStringLoadFunction<Data, Input, Context>
  | RouteDefinitionRegExpLoadFunction<Data, Input, Context>
  | RouteDefinitionFallbackLoadFunction<Data, Input, Context>;
