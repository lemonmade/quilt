import '@quilted/quilt/globals';

import {hydrate} from 'preact';
import {QueryClient} from '@tanstack/react-query';
import {createGraphQLFetch} from '@quilted/quilt/graphql';
import {Browser, BrowserContext} from '@quilted/quilt/browser';

import {App} from './App.tsx';

const element = document.querySelector('#app')!;
const browser = new Browser();

const queryClient = new QueryClient();
const fetchGraphQL = createGraphQLFetch({url: '/api/graphql'});

hydrate(
  <BrowserContext browser={browser}>
    <App context={{fetchGraphQL, queryClient}} />
  </BrowserContext>,
  element,
);
