import {Suspense} from 'preact/compat';

import {createRender} from '@quilted/quilt/testing';
import {BrowserContext, BrowserTestMock} from '@quilted/quilt/browser/testing';
import {TestRouting, TestRouter} from '@quilted/quilt/navigate/testing';
import {Localization} from '@quilted/quilt/localize';
import {AsyncActionCache, AsyncContext} from '@quilted/quilt/async';

import {AppContextReact} from '~/shared/context.ts';

import {GraphQLTesting, GraphQLController} from '../graphql.ts';

import {RenderOptions, RenderContext, RenderActions} from './types.ts';

/**
 * Renders a component with test-friendly versions of all global
 * context available to the application.
 */
export const renderApp = createRender<
  RenderOptions,
  RenderContext,
  RenderActions,
  true
>({
  // Create context that can be used by the `render` function, and referenced by test
  // authors on the `root.context` property. Context is used to share data between your
  // React tree and your test code, and is ideal for mocking out global context providers.
  context({
    router = new TestRouter(),
    browser = new BrowserTestMock(),
    graphql = new GraphQLController(),
    asyncCache = new AsyncActionCache(),
  }) {
    return {
      router,
      browser,
      graphql,
      fetchGraphQL: graphql.fetch,
      asyncCache,
    };
  },
  // Render all of our app-wide context providers around each component under test.
  render(element, context, {locale = 'en'}) {
    const {router, browser, graphql, asyncCache} = context;

    return (
      <AppContextReact.Provider value={context}>
        <BrowserContext browser={browser}>
          <Localization locale={locale}>
            <TestRouting router={router}>
              <GraphQLTesting controller={graphql}>
                <AsyncContext cache={asyncCache}>
                  <Suspense fallback={null}>{element}</Suspense>
                </AsyncContext>
              </GraphQLTesting>
            </TestRouting>
          </Localization>
        </BrowserContext>
      </AppContextReact.Provider>
    );
  },
  async afterRender(wrapper) {
    // If your components need to resolve data before they can render, you can
    // use this hook to wait for that data to be ready. This will cause the
    // `render` function to return a promise, so that the component is only usable
    // once the data is ready.

    await wrapper.act(async () => {
      await wrapper.context.graphql.resolveAll();
    });
  },
});
