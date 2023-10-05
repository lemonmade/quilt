import '@quilted/quilt/globals';
import {hydrateRoot} from 'react-dom/client';
import {httpBatchLink} from '@trpc/client';

import {trpc} from '~/shared/trpc.ts';

import {App} from './App.tsx';

const element = document.querySelector('#app')!;

const trpcClient = trpc.createClient({
  links: [httpBatchLink({url: new URL('/api', window.location.href).href})],
});

hydrateRoot(element, <App trpc={trpcClient} />);
