import {createTRPCReact, type CreateTRPCReact} from '@trpc/react-query';

import type {AppRouter} from '../trpc.ts';

export const trpc: CreateTRPCReact<AppRouter, {}> =
  createTRPCReact<AppRouter>();
