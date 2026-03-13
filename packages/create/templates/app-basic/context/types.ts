import type {Navigation} from '@quilted/quilt/navigation';
import type {Localization} from '@quilted/quilt/localize';

/**
 * The shared context for this application. Values in this object are
 * available to all components in the app via `useQuiltContext()` hooks
 * or the `useAppContext()` convenience hook.
 *
 * This interface extends a subset of `QuiltContext`, providing the
 * navigation and localization fields as required (non-optional) values.
 */
export interface AppContext {
  /**
   * The navigation instance for this application. Manages the current URL,
   * browser history, and programmatic navigation.
   */
  readonly navigation: Navigation;

  /**
   * The localization instance for this application. Contains the active
   * locale and formatting utilities for numbers, dates, currencies, and more.
   */
  readonly localization: Localization;
}
