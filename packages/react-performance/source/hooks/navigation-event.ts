import {useEffect, useRef} from 'react';
import {type PerformanceNavigation} from '@quilted/performance';

import {usePerformance} from './performance';

export function usePerformanceNavigationEvent<
  Metadata = Record<string, unknown>,
>(listener: (navigation: PerformanceNavigation<Metadata>) => void) {
  const performance = usePerformance();
  const listenerRef = useRef(listener);
  listenerRef.current = listener;

  useEffect(() => {
    const abort = new AbortController();

    performance.on(
      'navigation',
      (navigation) => {
        listenerRef.current(navigation as PerformanceNavigation<Metadata>);
      },
      {signal: abort.signal},
    );

    return () => {
      abort.abort();
    };
  });
}
