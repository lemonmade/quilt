import {createAsyncComponent} from '@quilted/quilt/async';

export const Start = createAsyncComponent(
  () => import('./start/Start/Start.tsx'),
);
