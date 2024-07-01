import {createOptionalContext} from '@quilted/quilt/context';
import type {Router} from '@quilted/quilt/navigate';

export interface AppContext {
  /**
   * The router used to control navigation throughout the application.
   */
  readonly router: Router;
}

export const AppContextReact = createOptionalContext<AppContext>();
export const useAppContext = AppContextReact.use;
