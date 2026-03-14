import {createDirectClient} from '@quilted/trpc/server';
import {QueryClient} from '@tanstack/react-query';

import {Navigation} from '@quilted/quilt/navigation';
import {Localization, parseAcceptLanguageHeader} from '@quilted/quilt/localize';

import {appRouter} from '../trpc.ts';
import type {AppContext} from './types.ts';

export class ServerAppContext implements AppContext {
  readonly navigation: Navigation;
  readonly localization: Localization;
  readonly trpc: AppContext['trpc'];
  readonly queryClient: QueryClient;

  constructor(request: Request) {
    this.navigation = new Navigation(request.url);
    this.localization = new Localization(
      parseAcceptLanguageHeader(request.headers.get('Accept-Language') ?? '') ??
        'en',
    );
    this.trpc = createDirectClient(appRouter);
    this.queryClient = new QueryClient();
  }
}
