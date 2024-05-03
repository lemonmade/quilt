import '@quilted/quilt/globals';

import {hydrateRoot} from 'react-dom/client';
import {QueryClient} from '@tanstack/react-query';
import {createGraphQLFetch} from '@quilted/quilt/graphql';
import {Browser, BrowserContext} from '@quilted/quilt/browser';

import {App} from './App.tsx';

const element = document.querySelector('#app')!;
const browser = new Browser();

const queryClient = new QueryClient();
const fetchGraphQL = createGraphQLFetch({url: '/api/graphql'});

hydrateRoot(
  element,
  <BrowserContext browser={browser}>
    <App context={{fetchGraphQL, queryClient}} />
  </BrowserContext>,
);
