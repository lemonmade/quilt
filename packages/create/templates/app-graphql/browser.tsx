import '@quilted/quilt/globals';

import {hydrate} from 'preact';
import {AsyncActionCache} from '@quilted/quilt/async';
import {createGraphQLFetch} from '@quilted/quilt/graphql';
import {Browser, BrowserContext} from '@quilted/quilt/browser';

import type {AppContext} from '~/shared/context.ts';

import {App} from './App.tsx';

const element = document.querySelector('#app')!;
const browser = new Browser();

const fetchGraphQL = createGraphQLFetch({url: '/api/graphql'});
const asyncCache = new AsyncActionCache();

const context = {
  fetchGraphQL,
  asyncCache,
} satisfies AppContext;

// Makes key parts of the app available in the browser console
Object.assign(globalThis, {app: context});

hydrate(
  <BrowserContext browser={browser}>
    <App context={context} />
  </BrowserContext>,
  element,
);
