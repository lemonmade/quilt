import '@quilted/quilt/globals';

import {hydrateRoot} from 'react-dom/client';
import {createGraphQLFetch} from '@quilted/quilt/graphql';

import {App} from './App.tsx';

const element = document.querySelector('#app')!;

hydrateRoot(
  element,
  <App fetchGraphQL={createGraphQLFetch({url: '/api/graphql'})} />,
);
