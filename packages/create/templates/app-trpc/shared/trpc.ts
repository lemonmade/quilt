import type {CreateTRPCClient} from '@trpc/client';
import {createTRPCReact, type CreateTRPCReact} from '@trpc/react-query';
import type {QueryClient} from '@tanstack/react-query';

// Get access to our app’s router type signature, which will
// provide strong typing on the queries and mutations we can
// perform.
import type {AppRouter} from '../trpc.ts';

export const trpc: CreateTRPCReact<AppRouter, {}> =
  createTRPCReact<AppRouter>();

declare module '~/shared/context.ts' {
  interface AppContext {
    trpc: CreateTRPCClient<AppRouter>;
    queryClient: QueryClient;
  }
}
