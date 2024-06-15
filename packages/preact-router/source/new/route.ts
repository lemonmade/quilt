import type {
  RouteDefinition,
  RouteDefinitionFallback,
  RouteDefinitionRegExp,
  RouteDefinitionString,
} from './types.ts';

export function route(
  match: string | string[],
  rest: Omit<RouteDefinitionString, 'match'>,
): RouteDefinitionString;
export function route(
  match: RegExp | RegExp[],
  rest: Omit<RouteDefinitionRegExp, 'match'>,
): RouteDefinitionRegExp;
export function route(
  match: string | RegExp | string[] | RegExp[],
  rest: Omit<RouteDefinition, 'match'>,
): RouteDefinition {
  return {match, ...rest} as any;
}

export function fallbackRoute(
  route: RouteDefinitionFallback,
): RouteDefinitionFallback {
  return route;
}
