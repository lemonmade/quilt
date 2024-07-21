import type {Router} from '@quilted/quilt/navigation';
import {createContextRouteFunction} from '@quilted/quilt/navigation';

import type {AppContext} from '~/shared/context.ts';

declare module '~/shared/context.ts' {
  interface AppContext {
    /**
     * The router used to control navigation throughout the application.
     */
    readonly router: Router;
  }
}

export const routeWithAppContext = createContextRouteFunction<AppContext>();
