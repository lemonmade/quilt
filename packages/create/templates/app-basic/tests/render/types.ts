import type {TestRouter} from '@quilted/quilt/navigate/testing';
import type {BrowserTestMock} from '@quilted/quilt/browser/testing';

import type {AppContext} from '~/shared/context.ts';

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
}

export interface RenderActions extends Record<string, never> {}
