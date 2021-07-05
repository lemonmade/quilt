import {useContext} from 'react';
import {useServerAction} from '@quilted/react-server-render';

import {StaticRendererContext} from '../context';
import type {RouteDefinition} from '../types';

export interface Options {
  prefix?: string;
  fallback?: boolean;
  consumedPath?: string;
}

export function useStaticRenderer(
  routes: RouteDefinition[],
  {prefix, fallback = false, consumedPath}: Options = {},
) {
  const staticRender = useContext(StaticRendererContext) ?? undefined;

  useServerAction(() => {
    staticRender?.record({
      prefix,
      consumedPath,
      routes: fallback ? [...routes, {render: () => null}] : routes,
    });
  }, staticRender?.kind);

  return staticRender;
}
