import type {TestNavigation} from '@quilted/quilt/navigation/testing';
import type {TestBrowser} from '@quilted/quilt/browser/testing';
import type {Localization} from '@quilted/quilt/localize';

import type {GraphQLController} from '../graphql.ts';

export interface RenderOptions {
  /**
   * A custom navigation to use for this component test.
   */
  readonly navigation?: TestNavigation;

  /**
   * A custom environment for this component test.
   */
  readonly browser?: TestBrowser;

  /**
   * A custom localization instance to use for this component test.
   */
  readonly localization?: Localization;

  /**
   * An object that controls the responses to GraphQL queries and mutations
   * for the component under test.
   */
  readonly graphql?: GraphQLController;
}

export interface RenderContext {
  /**
   * The navigation used for this component test.
   */
  readonly navigation: TestNavigation;

  /**
   * The browser environment for this component test.
   */
  readonly browser: TestBrowser;

  /**
   * The localization used for this component test.
   */
  readonly localization: Localization;

  /**
   * The GraphQL context used for this component test.
   */
  readonly graphql: {
    readonly controller: GraphQLController;
  };
}

export interface RenderActions extends Record<string, never> {}
