import {createGraphQLFetch, GraphQLCache} from '@quilted/quilt/graphql';

import type {AppContext} from './types.ts';
import {NavigationForApp} from './navigation.ts';

export class BrowserAppContext implements AppContext {
  readonly navigation: NavigationForApp;
  readonly graphql: AppContext['graphql'];

  constructor() {
    this.navigation = new NavigationForApp();

    const graphQLFetch = createGraphQLFetch({url: '/api/graphql'});
    const graphQLCache = new GraphQLCache({fetch: graphQLFetch});

    this.graphql = {
      fetch: graphQLFetch,
      cache: graphQLCache,
    };
  }
}
