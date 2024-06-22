import type {
  RouteDefinition,
  RouteDefinitionFallback,
  RouteDefinitionRegExp,
  RouteDefinitionString,
} from './types.ts';

export function route<Data = unknown, Input = unknown>(
  match: '*' | true,
  rest: Omit<RouteDefinitionFallback<Data, Input>, 'match'>,
): RouteDefinitionFallback<Data, Input>;
export function route<Data = unknown, Input = unknown>(
  match: string | string[],
  rest: Omit<RouteDefinitionString<Data, Input>, 'match'>,
): RouteDefinitionString<Data, Input>;
export function route<Data = unknown, Input = unknown>(
  match: RegExp | RegExp[],
  rest: Omit<RouteDefinitionRegExp<Data, Input>, 'match'>,
): RouteDefinitionRegExp<Data, Input>;
export function route<Data = unknown, Input = unknown>(
  match: any,
  rest: any,
): RouteDefinition<Data, Input> {
  return {match, ...rest} as any;
}

export function fallbackRoute(
  route: RouteDefinitionFallback,
): RouteDefinitionFallback {
  return route;
}
