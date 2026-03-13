import type {TestNavigation} from '@quilted/quilt/navigation/testing';
import type {TestBrowser} from '@quilted/quilt/browser/testing';
import type {Localization} from '@quilted/quilt/localize';
import type {QueryClient} from '@tanstack/react-query';

export interface RenderOptions {
  /**
   * A custom navigation to use for this component test.
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

  /**
   * The react-query client used for this component test.
   */
  readonly queryClient: QueryClient;
}

export interface RenderActions extends Record<string, never> {}
