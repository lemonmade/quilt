import type {Navigation} from './navigation.ts';
import type {TRPCUntypedClient} from '@trpc/client';
import type {QueryClient} from '@tanstack/react-query';

import type {AppRouter} from '../trpc.ts';

export interface AppContext {
  readonly navigation: Navigation;
  readonly trpc: TRPCUntypedClient<AppRouter>;
  readonly queryClient: QueryClient;
}
