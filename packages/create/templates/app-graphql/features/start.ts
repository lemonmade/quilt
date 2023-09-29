import {createAsyncComponent} from '@quilted/quilt';

export const Start = createAsyncComponent(
  () => import('./start/Start/Start.tsx'),
);
