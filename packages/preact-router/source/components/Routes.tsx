import type {RouteDefinition} from '../types.ts';
import {useRoutes} from '../hooks/routes.tsx';

export function Routes({list}: {list: readonly RouteDefinition<any, any>[]}) {
  return useRoutes(list);
}
