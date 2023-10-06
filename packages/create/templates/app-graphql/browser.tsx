import '@quilted/quilt/globals';

import {hydrateRoot} from 'react-dom/client';
import {createGraphQLFetchOverHTTP} from '@quilted/quilt/graphql';

import {App} from './App.tsx';

const element = document.querySelector('#app')!;

hydrateRoot(
  element,
  <App fetchGraphQL={createGraphQLFetchOverHTTP({url: '/api/graphql'})} />,
);
