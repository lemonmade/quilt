import {httpBatchLink} from '@trpc/client';
import {QueryClient} from '@tanstack/react-query';

import {Navigation} from '@quilted/quilt/navigation';
import {Localization} from '@quilted/quilt/localize';

import {trpc} from './trpc.ts';
import type {AppContext} from './types.ts';

export class BrowserAppContext implements AppContext {
  readonly navigation: Navigation;
  readonly localization: Localization;
  readonly trpc: AppContext['trpc'];
  readonly queryClient: QueryClient;

  constructor() {
    this.navigation = new Navigation();
    this.localization = new Localization(navigator.language);
    this.queryClient = new QueryClient();
    this.trpc = trpc.createClient({
      links: [httpBatchLink({url: new URL('/api', window.location.href).href})],
    });
  }
}
