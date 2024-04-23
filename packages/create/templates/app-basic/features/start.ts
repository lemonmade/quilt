import {AsyncComponent} from '@quilted/quilt/async';

export const Start = AsyncComponent.from(
  () => import('./start/Start/Start.tsx'),
);
