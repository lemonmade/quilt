import '@quilted/quilt/globals';
import {hydrateRoot} from 'react-dom/client';
import {httpBatchLink} from '@trpc/client';
import {QueryClient} from '@tanstack/react-query';
import {Browser, BrowserContext} from '@quilted/quilt/browser';

import {trpc} from '~/shared/trpc.ts';

import {App} from './App.tsx';

const element = document.querySelector('#app')!;
const browser = new Browser();

const queryClient = new QueryClient();
const trpcClient = trpc.createClient({
  links: [httpBatchLink({url: new URL('/api', window.location.href).href})],
});

hydrateRoot(
  element,
  <BrowserContext browser={browser}>
    <App context={{trpc: trpcClient, queryClient}} />
  </BrowserContext>,
);
