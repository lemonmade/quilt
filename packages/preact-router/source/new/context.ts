import {createOptionalContext} from '@quilted/preact-context';

import type {Router} from './Router.ts';
import type {RouteNavigationEntry} from './types.ts';

export const RouterContext = createOptionalContext<Router>();
export const RouteNavigationEntryContext =
  createOptionalContext<RouteNavigationEntry<any, any>>();
