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
      fallback,
      consumedPath,
      routes,
    });
  }, staticRender?.kind);

  return staticRender;
}
