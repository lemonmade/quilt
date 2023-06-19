import {
  createOptionalContext,
  createUseContextHook,
  createUseOptionalValueHook,
} from '@quilted/quilt';

export interface AppContext {}

export const AppContextReact = createOptionalContext<AppContext>();
export const useAppContext = createUseContextHook(AppContextReact);

export function createUseAppContextHook<T>(hook: (context: AppContext) => T) {
  return createUseOptionalValueHook<T>(() => hook(useAppContext()));
}
