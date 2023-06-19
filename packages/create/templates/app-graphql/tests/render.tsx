import '@quilted/quilt/matchers';

import {
  createRender,
  QuiltAppTesting,
  createTestRouter,
} from '@quilted/quilt/testing';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';

import {
  AppContextReact,
  type AppContext as AppContextType,
} from '~/shared/context.ts';

import {
  TestGraphQL,
  fillGraphQL,
  createGraphQLController,
  type GraphQLController,
} from './graphql.ts';

type Router = ReturnType<typeof createTestRouter>;

export {createTestRouter, fillGraphQL, createGraphQLController};

export interface RenderOptions {
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
   * import {renderWithAppContext, fillGraphQL, createGraphQLController} from '~/tests/render.tsx';
   *
   * import {MyComponent} from './MyComponent.tsx';
   * import myComponentQuery from './MyComponentQuery.graphql';
   *
   * const myComponent = await renderWithAppContext(<MyComponent />, {
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

export interface RenderContext extends AppContextType {
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

export interface RenderActions extends Record<string, never> {}

/**
 * Renders a component with test-friendly versions of all global
 * context available to the application.
 */
export const renderWithAppContext = createRender<
  RenderOptions,
  RenderContext,
  RenderActions,
  true
>({
  // Create context that can be used by the `render` function, and referenced by test
  // authors on the `root.context` property. Context is used to share data between your
  // React tree and your test code, and is ideal for mocking out global context providers.
  context({router = createTestRouter(), graphql = createGraphQLController()}) {
    return {router, graphql, queryClient: new QueryClient()};
  },
  // Render all of our app-wide context providers around each component under test.
  render(element, context, {locale}) {
    const {router, graphql, queryClient} = context;

    return (
      <QuiltAppTesting routing={router} localization={locale}>
        <AppContextReact.Provider value={context}>
          <TestGraphQL controller={graphql}>
            <QueryClientProvider client={queryClient}>
              {element}
            </QueryClientProvider>
          </TestGraphQL>
        </AppContextReact.Provider>
      </QuiltAppTesting>
    );
  },
  async afterRender(wrapper) {
    // If your components need to resolve data before they can render, you can
    // use this hook to wait for that data to be ready. This will cause the
    // `render` function to return a promise, so that the component is only usable
    // once the data is ready.

    await wrapper.act(async () => {
      await wrapper.context.graphql.resolveAll();

      // react-query needs an extra tick to set state in response to GraphQL queries.
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  },
});
