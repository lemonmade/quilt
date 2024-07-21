import type {
  RouteDefinition,
  RouteDefinitionFallback,
  RouteDefinitionRegExp,
  RouteDefinitionString,
} from './types.ts';

export function route<Data = unknown, Input = unknown, Context = unknown>(
  match: '*' | true,
  rest: Omit<RouteDefinitionFallback<Data, Input, Context>, 'match'>,
): RouteDefinitionFallback<Data, Input, Context>;
export function route<Data = unknown, Input = unknown, Context = unknown>(
  match: string | string[],
  rest: Omit<RouteDefinitionString<Data, Input, Context>, 'match'>,
): RouteDefinitionString<Data, Input, Context>;
export function route<Data = unknown, Input = unknown, Context = unknown>(
  match: RegExp | RegExp[],
  rest: Omit<RouteDefinitionRegExp<Data, Input, Context>, 'match'>,
): RouteDefinitionRegExp<Data, Input, Context>;
export function route<Data = unknown, Input = unknown, Context = unknown>(
  match: any,
  rest: any,
): RouteDefinition<Data, Input, Context> {
  return {match, ...rest} as any;
}

export function fallbackRoute(
  route: RouteDefinitionFallback,
): RouteDefinitionFallback {
  return route;
}

export function createContextRouteFunction<Context>() {
  function routeWithContext<Data = unknown, Input = unknown>(
    match: '*' | true,
    rest: Omit<RouteDefinitionFallback<Data, Input, Context>, 'match'>,
  ): RouteDefinitionFallback<Data, Input, Context>;
  function routeWithContext<Data = unknown, Input = unknown>(
    match: string | string[],
    rest: Omit<RouteDefinitionString<Data, Input, Context>, 'match'>,
  ): RouteDefinitionString<Data, Input, Context>;
  function routeWithContext<Data = unknown, Input = unknown>(
    match: RegExp | RegExp[],
    rest: Omit<RouteDefinitionRegExp<Data, Input, Context>, 'match'>,
  ): RouteDefinitionRegExp<Data, Input, Context>;
  function routeWithContext<_Data = unknown, _Input = unknown>(
    match: any,
    rest: any,
  ) {
    return {match, ...rest} as any;
  }

  return routeWithContext;
}
