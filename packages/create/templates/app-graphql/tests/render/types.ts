import type {TestRouter} from '@quilted/quilt/navigate/testing';
import type {BrowserTestMock} from '@quilted/quilt/browser/testing';
import type {QueryClient} from '@tanstack/react-query';

import type {AppContext} from '~/shared/context.ts';

import type {GraphQLController} from '../graphql.ts';

export interface RenderOptions {
  /**
   * A custom router to use for this component test. You can use a
   * custom router to simulate a particular URL, and you can spy on
   * its navigation method to check that components navigate as
   * you expect.
   */
  readonly router?: TestRouter;

  /**
   * A custom environment for this component test.
   */
  readonly browser?: BrowserTestMock;

  /**
   * An object that controls the responses to GraphQL queries and mutations
   * for the component under test. You can customize the responses using
   * the `fillGraphQL` and `createGraphQLController` utilities provided
   * by this module.
   *
   * ```tsx
   * import {renderApp} from '~/tests/render.ts';
   * import {fillGraphQL, GraphQLController} from '~/tests/graphql.ts';
   *
   * import {MyComponent} from './MyComponent.tsx';
   * import myComponentQuery from './MyComponentQuery.graphql';
   *
   * const myComponent = await renderApp(<MyComponent />, {
   *   graphql: new GraphQLController([
   *     fillGraphQL(myComponentQuery, {me: {name: 'Winston'}}),
   *   ]),
   * });
   * ```
   */
  readonly graphql?: GraphQLController;

  /**
   * A custom locale to use for this component test.
   */
  readonly locale?: string;
}

export interface RenderContext extends AppContext {
  /**
   * The router used for this component test.
   */
  readonly router: TestRouter;

  /**
   * The browser environment for this component test.
   */
  readonly browser: BrowserTestMock;

  /**
   * The GraphQL controller used for this component test.
   */
  readonly graphql: GraphQLController;

  /**
   * The react-query client used for this component test.
   */
  readonly queryClient: QueryClient;
}

export interface RenderActions extends Record<string, never> {}
