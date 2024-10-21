import '@quilted/quilt/globals';

import {hydrate} from '@quilted/quilt/browser';
import {Router} from '@quilted/quilt/navigation';

import {httpBatchLink} from '@trpc/client';
import {QueryClient} from '@tanstack/react-query';

import type {AppContext} from '~/shared/context.ts';
import {trpc} from '~/shared/trpc.ts';

import {App} from './App.tsx';

const queryClient = new QueryClient();
const trpcClient = trpc.createClient({
  links: [httpBatchLink({url: new URL('/api', window.location.href).href})],
});

const context = {
  router: new Router(),
  trpc: trpcClient,
  queryClient,
} satisfies AppContext;

// Makes key parts of the app available in the browser console
Object.defineProperty(globalThis, 'app', {
  value: {context},
  enumerable: false,
  configurable: true,
});

hydrate(<App context={context} />);
