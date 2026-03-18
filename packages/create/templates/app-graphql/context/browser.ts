import {Navigation} from '@quilted/quilt/navigation';
import {Localization} from '@quilted/quilt/localize';
import {createGraphQLFetch, GraphQLClient} from '@quilted/quilt/graphql';

import type {AppContext} from './types.ts';

export class BrowserAppContext implements AppContext {
  readonly navigation: Navigation;
  readonly localization: Localization;
  readonly graphql: GraphQLClient;

  constructor() {
    this.navigation = new Navigation();
    this.localization = new Localization(navigator.language);
    this.graphql = new GraphQLClient(createGraphQLFetch({url: '/api/graphql'}));
  }
}
