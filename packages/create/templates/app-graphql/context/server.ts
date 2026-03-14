import {Navigation} from '@quilted/quilt/navigation';
import {Localization, parseAcceptLanguageHeader} from '@quilted/quilt/localize';
import {GraphQLClient} from '@quilted/quilt/graphql';

import type {AppContext} from './types.ts';

export class ServerAppContext implements AppContext {
  readonly navigation: Navigation;
  readonly localization: Localization;
  readonly graphql: GraphQLClient;

  constructor(request: Request) {
    this.navigation = new Navigation(request.url);
    this.localization = new Localization(
      parseAcceptLanguageHeader(request.headers.get('Accept-Language') ?? '') ??
        'en',
    );

    this.graphql = new GraphQLClient(async (...args) => {
      const {performGraphQLOperation} = await import('../server/graphql.ts');
      return performGraphQLOperation(...args);
    });
  }
}
