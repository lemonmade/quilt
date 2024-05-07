import {createOptionalContext} from '@quilted/quilt/context';

export interface AppContext {}

export const AppContextReact = createOptionalContext<AppContext>();
export const useAppContext = AppContextReact.use;
