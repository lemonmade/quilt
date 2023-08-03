import type {createTestRouter} from '@quilted/quilt/testing';

import type {AppContext} from '~/shared/context.ts';

type Router = ReturnType<typeof createTestRouter>;

export interface RenderOptions {
  /**
   * A custom router to use for this component test. You can use a
   * custom router to simulate a particular URL, and you can spy on
   * its navigation method to check that components navigate as
   * you expect.
   */
  readonly router?: Router;

  /**
   * A custom locale to use for this component test.
   */
  readonly locale?: string;
}

export interface RenderContext extends AppContext {
  /**
   * The router used for this component test.
   */
  readonly router: Router;
}

export interface RenderActions extends Record<string, never> {}
