import {useRoutes} from '@quilted/quilt';
import type {RouteDefinition} from '@quilted/quilt';

import {Start} from '../../features/Start';

const routes: RouteDefinition[] = [{match: '/', render: () => <Start />}];

export function Routes() {
  return useRoutes(routes);
}
