import {useMemo, useLayoutEffect, type PropsWithChildren} from 'react';
import {AsyncHydratedContext} from './context';
import {signal} from '@quilted/react-signals';

/**
 * Only needed for the following features:
 *
 * - `render: 'client'` (needed to correctly hydrate initial components)
 */
export function AsyncContext({children}: PropsWithChildren) {
  const hydrationSignal = useMemo(() => signal(false), []);

  if (typeof document === 'object') {
    useLayoutEffect(() => {
      hydrationSignal.value = true;
    }, []);
  }

  return (
    <AsyncHydratedContext.Provider value={hydrationSignal}>
      {children}
    </AsyncHydratedContext.Provider>
  );
}
