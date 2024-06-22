import {RouteNavigationEntryContext} from '../context.ts';
import type {RouteNavigationEntry} from '../types.ts';

export function useRouteNavigationEntry<Data = unknown, Input = unknown>() {
  return RouteNavigationEntryContext.use() as RouteNavigationEntry<Data, Input>;
}
