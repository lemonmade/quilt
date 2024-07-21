import '@quilted/quilt/globals';

import {hydrate} from 'preact';
import {httpBatchLink} from '@trpc/client';
import {QueryClient} from '@tanstack/react-query';
import {Browser, BrowserContext} from '@quilted/quilt/browser';
import {Router} from '@quilted/quilt/navigation';

import type {AppContext} from '~/shared/context.ts';
import {trpc} from '~/shared/trpc.ts';

import {App} from './App.tsx';

const element = document.querySelector('#app')!;
const browser = new Browser();

const queryClient = new QueryClient();
const trpcClient = trpc.createClient({
  links: [httpBatchLink({url: new URL('/api', window.location.href).href})],
});

const context = {
  router: new Router(browser.request.url),
  trpc: trpcClient,
  queryClient,
} satisfies AppContext;

// Makes key parts of the app available in the browser console
Object.assign(globalThis, {app: context});

hydrate(
  <BrowserContext browser={browser}>
    <App context={context} />
  </BrowserContext>,
  element,
);
