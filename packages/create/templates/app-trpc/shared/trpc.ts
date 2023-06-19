import {type TRPCClient} from '@trpc/client';
import {createTRPCReact, type CreateTRPCReact} from '@trpc/react-query';

// Get access to our app’s router type signature, which will
// provide strong typing on the queries and mutations we can
// perform.
import {type AppRouter} from '../trpc.ts';

export const trpc: CreateTRPCReact<AppRouter, unknown, null> =
  createTRPCReact<AppRouter>();

declare module '~/shared/context.ts' {
  interface AppContext {
    trpc: TRPCClient<AppRouter>;
  }
}
