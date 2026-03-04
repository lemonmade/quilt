import {createDirectClient} from '@quilted/trpc/server';
import {QueryClient} from '@tanstack/react-query';

import type {AppContext} from './types.ts';
import {NavigationForApp} from './navigation.ts';
import {appRouter} from '../trpc.ts';

export class ServerAppContext implements AppContext {
  readonly navigation: NavigationForApp;
  readonly trpc: AppContext['trpc'];
  readonly queryClient: QueryClient;

  constructor(request: Request) {
    this.navigation = new NavigationForApp(request.url);
    this.trpc = createDirectClient(appRouter);
    this.queryClient = new QueryClient();
  }
}
