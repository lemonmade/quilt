import {useQuiltContext} from '@quilted/preact-context';
import type {RouteNavigationEntry} from '../types.ts';

export function useRouteNavigationEntry<Data = unknown, Input = unknown>() {
  return useQuiltContext('navigationEntry') as RouteNavigationEntry<
    Data,
    Input
  >;
}
