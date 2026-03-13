import type {TestNavigation} from '@quilted/quilt/navigation/testing';
import type {TestBrowser} from '@quilted/quilt/browser/testing';
import type {Localization} from '@quilted/quilt/localize';

export interface RenderOptions {
  /**
   * A custom navigation to use for this component test. You can use a
   * custom router to simulate a particular URL, and you can spy on
   * its navigation method to check that components navigate as
   * you expect.
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
}

export interface RenderActions extends Record<string, never> {}
