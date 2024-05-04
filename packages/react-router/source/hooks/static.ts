import {useContext} from 'react';

import {StaticRendererContext} from '../context.ts';
import type {RouteDefinition} from '../types.ts';

export interface Options {
  prefix?: string;
  fallback?: boolean;
  consumedPath?: string;
}

export function useStaticRenderer(
  routes: readonly RouteDefinition[],
  {prefix, fallback = false, consumedPath}: Options = {},
) {
  const staticRender = useContext(StaticRendererContext);

  staticRender?.record({
    prefix,
    fallback,
    consumedPath,
    routes,
  });

  return staticRender;
}
