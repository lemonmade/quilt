import {httpBatchLink} from '@trpc/client';
import {QueryClient} from '@tanstack/react-query';

import type {AppContext} from './types.ts';
import {NavigationForApp} from './navigation.ts';
import {trpc} from './trpc.ts';

export class BrowserAppContext implements AppContext {
  readonly navigation: NavigationForApp;
  readonly trpc: AppContext['trpc'];
  readonly queryClient: QueryClient;

  constructor() {
    this.navigation = new NavigationForApp();
    this.queryClient = new QueryClient();
    this.trpc = trpc.createClient({
      links: [httpBatchLink({url: new URL('/api', window.location.href).href})],
    });
  }
}
