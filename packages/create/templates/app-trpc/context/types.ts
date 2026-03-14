import type {TRPCClient} from '@trpc/client';
import type {QueryClient} from '@tanstack/react-query';
import type {Navigation} from '@quilted/quilt/navigation';
import type {Localization} from '@quilted/quilt/localize';

import type {AppRouter} from '../trpc.ts';

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
   * The tRPC client for this application, used to call tRPC procedures.
   */
  readonly trpc: TRPCClient<AppRouter>;

  /**
   * The react-query client for this application, used by tRPC to manage
   * request state and caching.
   */
  readonly queryClient: QueryClient;
}
