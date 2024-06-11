import {AsyncComponent} from '@quilted/quilt/async';

export const Home = AsyncComponent.from(() => import('./home/Home.tsx'));
