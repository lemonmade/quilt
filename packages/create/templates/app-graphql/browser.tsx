import '@quilted/quilt/globals';

import {hydrate} from 'preact';
import {createGraphQLFetch, GraphQLCache} from '@quilted/quilt/graphql';
import {Browser, BrowserContext} from '@quilted/quilt/browser';
import {Router} from '@quilted/quilt/navigation';

import type {AppContext} from '~/shared/context.ts';

import {App} from './App.tsx';

const element = document.querySelector('#app')!;
const browser = new Browser();

const graphQLFetch = createGraphQLFetch({url: '/api/graphql'});
const graphQLCache = new GraphQLCache({fetch: graphQLFetch});

const context = {
  router: new Router(browser.request.url),
  graphql: {
    fetch: graphQLFetch,
    cache: graphQLCache,
  },
} satisfies AppContext;

// Makes key parts of the app available in the browser console
Object.assign(globalThis, {app: context});

hydrate(
  <BrowserContext browser={browser}>
    <App context={context} />
  </BrowserContext>,
  element,
);
