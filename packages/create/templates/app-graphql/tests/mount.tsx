import '@quilted/quilt/matchers';

import {type Router} from '@quilted/quilt';
import {
  createMount,
  QuiltAppTesting,
  createTestRouter,
} from '@quilted/quilt/testing';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';

import {
  TestGraphQL,
  fillGraphQL,
  createGraphQLController,
  type GraphQLController,
} from './graphql';

export {createTestRouter, fillGraphQL, createGraphQLController};

export interface MountOptions {
  /**
   * A custom router to use for this component test. You can use a
   * custom router to simulate a particular URL, and you can spy on
   * its navigation method to check that components navigate as
   * you expect.
   */
  router?: Router;

  /**
   * An object that controls the responses to GraphQL queries and mutations
   * for the component under test. You can customize the responses using
   * the `fillGraphQL` and `createGraphQLController` utilities provided
   * by this module.
   *
   * ```tsx
   * import {mountWithAppContext, fillGraphQL, createGraphQLController} from '~/tests/mount';
   *
   * import {MyComponent} from './MyComponent';
   * import myComponentQuery from './MyComponentQuery.graphql';
   *
   * const myComponent = await mountWithAppContext(<MyComponent />, {
   *   graphql: createGraphQLController(
   *     fillGraphQL(myComponentQuery, {user: {name: 'Winston'}}),
   *   ),
   * });
   * ```
   */
  graphql?: GraphQLController;

  /**
   * A custom locale to use for this component test.
   */
  locale?: string;
}

export interface MountContext {
  /**
   * The router used for this component test.
   */
  readonly router: Router;

  /**
   * The GraphQL controller used for this component test.
   */
  readonly graphql: GraphQLController;

  /**
   * The react-query client used for this component test.
   */
  readonly queryClient: QueryClient;
}

export interface MountActions extends Record<string, never> {}

/**
 * Mounts a component with test-friendly versions of all global
 * context available to the application.
 */
export const mountWithAppContext = createMount<
  MountOptions,
  MountContext,
  MountActions,
  true
>({
  // Create context that can be used by the `render` function, and referenced by test
  // authors on the `root.context` property. Context is used to share data between your
  // React tree and your test code, and is ideal for mocking out global context providers.
  context({router = createTestRouter(), graphql = createGraphQLController()}) {
    return {router, graphql, queryClient: new QueryClient()};
  },
  // Render all of our app-wide context providers around each component under test.
  render(element, {router, graphql, queryClient}, {locale}) {
    return (
      <QuiltAppTesting routing={router} localization={locale}>
        <TestGraphQL controller={graphql}>
          <QueryClientProvider client={queryClient}>
            {element}
          </QueryClientProvider>
        </TestGraphQL>
      </QuiltAppTesting>
    );
  },
  async afterMount(wrapper) {
    // If your components need to resolve data before they can render, you can
    // use this hook to wait for that data to be ready. This will cause the
    // `mount` function to return a promise, so that the component is only usable
    // once the data is ready.

    await wrapper.act(async () => {
      await wrapper.context.graphql.resolveAll();

      // react-query needs an extra tick to set state in response to GraphQL queries.
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  },
});
