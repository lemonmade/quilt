import type {GraphQLClient} from '@quilted/quilt/graphql';
import type {Navigation} from '@quilted/quilt/navigation';
import type {Localization} from '@quilted/quilt/localize';

/**
 * The shared context for this application. Values in this object are
 * available to all components in the app via `useAppContext()`.
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

  /**
   * The GraphQL client for this application. Provides the fetch function
   * used to execute operations and the cache used to store results.
   */
  readonly graphql: GraphQLClient;
}
