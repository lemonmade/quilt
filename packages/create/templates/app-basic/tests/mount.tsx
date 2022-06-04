import '@quilted/quilt/matchers';

import {
  createMount,
  TestRouter,
  createTestRouter,
} from '@quilted/quilt/testing';

type Router = ReturnType<typeof createTestRouter>;

export {createTestRouter};

export interface MountOptions {
  /**
   * A custom router to use for this component test. You can use a
   * custom router to simulate a particular URL, and you can spy on
   * its navigation method to check that components navigate as
   * you expect.
   */
  router?: Router;
}

export interface MountContext {
  /**
   * The router used for this component test.
   */
  router: Router;
}

export interface MountActions extends Record<string, never> {}

/**
 * Mounts a component with test-friendly versions of all global
 * context available to the application.
 */
export const mountWithAppContext = createMount<
  MountOptions,
  MountContext,
  MountActions
>({
  context({router = createTestRouter()}) {
    return {router};
  },
  render(element, {router}) {
    return <TestRouter router={router}>{element}</TestRouter>;
  },
});
