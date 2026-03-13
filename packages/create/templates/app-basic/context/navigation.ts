import {createContextRouteFunction, Navigation} from '@quilted/quilt/navigation';

import type {AppContext} from './types.ts';

export const routeWithAppContext = createContextRouteFunction<AppContext>();

export {Navigation};
