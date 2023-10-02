import {createRender} from '@quilted/quilt/react/testing';
import {TestRouting, TestRouter} from '@quilted/quilt/navigate/testing';
import {Localization} from '@quilted/quilt/localize';

import {AppContextReact} from '~/shared/context.ts';

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
  context({router = new TestRouter()}) {
    return {router};
  },
  // Render all of our app-wide context providers around each component under test.
  render(element, context, {locale = 'en'}) {
    const {router} = context;

    return (
      <Localization locale={locale}>
        <TestRouting router={router}>
          <AppContextReact.Provider value={context}>
            {element}
          </AppContextReact.Provider>
        </TestRouting>
      </Localization>
    );
  },
  async afterRender() {
    // If your components need to resolve data before they can render, you can
    // use this hook to wait for that data to be ready. This will cause the
    // `render` function to return a promise, so that the component is only usable
    // once the data is ready.
  },
});
