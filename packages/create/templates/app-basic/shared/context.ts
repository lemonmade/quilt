import {createOptionalContext} from '@quilted/quilt/context';

export interface AppContext {}

export const AppContextPreact = createOptionalContext<AppContext>();
export const useAppContext = AppContextPreact.use;
