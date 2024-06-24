import type {RouteDefinition} from '../types.ts';
import {useRoutes} from '../hooks/routes.tsx';

export function Routes<Context = unknown>({
  list,
  context,
}: {
  list: readonly RouteDefinition<any, any, Context>[];
  context?: Context;
}) {
  return useRoutes(list, {context});
}
