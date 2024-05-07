import type {RenderableProps} from 'preact';
import {useMemo, useLayoutEffect} from 'preact/hooks';
import {signal} from '@quilted/preact-signals';

import {AsyncHydratedContext} from './context.ts';

/**
 * Only needed for the following features:
 *
 * - `<AsyncComponent server={false}>` (needed to correctly hydrate client-only components)
 */
export function AsyncContext({children}: RenderableProps<{}>) {
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
