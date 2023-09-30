import {
  createOptionalContext,
  createUseContextHook,
} from '@quilted/quilt/react/tools';

export interface AppContext {}

export const AppContextReact = createOptionalContext<AppContext>();
export const useAppContext = createUseContextHook(AppContextReact);
