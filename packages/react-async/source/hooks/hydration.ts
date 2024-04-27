import {useContext} from 'react';

import {AsyncHydratedContext} from '../context.ts';

export function useHydrated() {
  const hydrated = useContext(AsyncHydratedContext);
  return hydrated?.value ?? true;
}
