import {createOptionalContext} from '@quilted/quilt/context';

import type {AppContext} from './types.ts';

export const AppContextPreact = createOptionalContext<AppContext>();
export const useAppContext = AppContextPreact.use;
