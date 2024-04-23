import {AsyncModule, AsyncComponent} from '@quilted/quilt/async';

export const Start = AsyncComponent.from(
  new AsyncModule(() => import('./start/Start/Start.tsx')),
);
