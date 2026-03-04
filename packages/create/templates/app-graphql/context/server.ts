import {GraphQLCache} from '@quilted/quilt/graphql';

import type {AppContext} from './types.ts';
import {NavigationForApp} from './navigation.ts';

export class ServerAppContext implements AppContext {
  readonly navigation: NavigationForApp;
  readonly graphql: AppContext['graphql'];

  constructor(request: Request) {
    this.navigation = new NavigationForApp(request.url);

    const graphQLFetch: AppContext['graphql']['fetch'] = async (...args) => {
      const {performGraphQLOperation} = await import('../server/graphql.ts');
      return performGraphQLOperation(...args);
    };

    this.graphql = {
      fetch: graphQLFetch,
      cache: new GraphQLCache({fetch: graphQLFetch}),
    };
  }
}
