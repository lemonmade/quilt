import {AsyncComponent} from '@quilted/quilt/async';

export {default as homeQuery} from './home/HomeQuery.graphql';

export const Home = AsyncComponent.from(() => import('./home/Home.tsx'));
