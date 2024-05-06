import {useContext} from 'preact/hooks';

import {AsyncHydratedContext} from '../context.ts';

export function useHydrated() {
  const hydrated = useContext(AsyncHydratedContext);
  return hydrated?.value ?? true;
}
