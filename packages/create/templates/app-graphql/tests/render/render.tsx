import {Suspense} from 'preact/compat';

import {createRender} from '@quilted/quilt/testing';
import {TestBrowser} from '@quilted/quilt/browser/testing';
import {TestNavigation} from '@quilted/quilt/navigation/testing';
import {Localization} from '@quilted/quilt/localize';
import {QuiltFrameworkTestContext} from '@quilted/quilt/context/testing';

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
    navigation = new TestNavigation(),
    browser = new TestBrowser(),
    localization = new Localization('en'),
    graphql = new GraphQLController(),
  }) {
    return {navigation, browser, localization, graphql: {controller: graphql}};
  },
  // Render all of our app-wide context providers around each component under test.
  render(element, {navigation, browser, localization, graphql}) {
    return (
      <QuiltFrameworkTestContext navigation={navigation} browser={browser} localization={localization}>
        <GraphQLTesting controller={graphql.controller}>
          <Suspense fallback={null}>{element}</Suspense>
        </GraphQLTesting>
      </QuiltFrameworkTestContext>
    );
  },
  async afterRender(wrapper) {
    // If your components need to resolve data before they can render, you can
    // use this hook to wait for that data to be ready. This will cause the
    // `render` function to return a promise, so that the component is only usable
    // once the data is ready.

    await wrapper.act(async () => {
      await wrapper.context.graphql.controller.resolveAll();
    });
  },
});
