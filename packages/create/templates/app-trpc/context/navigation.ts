import {createContextRouteFunction, Router} from '@quilted/quilt/navigation';

import type {AppContext} from './types.ts';

export interface Navigation {
  readonly router: Router;
}

export class NavigationForApp implements Navigation {
  readonly router: Router;

  constructor(url?: string | URL) {
    this.router = new Router(url);
  }
}

export const routeWithAppContext = createContextRouteFunction<AppContext>();
