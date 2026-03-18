import {createOptionalContext} from '@quilted/quilt/context';

import type {AppContext} from './types.ts';

/**
 * The Preact context object for this application's shared context.
 * Provide it in `App.tsx` via `<AppContextPreact.Provider value={context}>`.
 */
export const AppContextPreact = createOptionalContext<AppContext>();

/**
 * Returns the app's shared context. All fields in `AppContext` are required
 * and will be available anywhere inside `<AppContextPreact.Provider>`.
 */
export const useAppContext = AppContextPreact.use;
