import {PropsWithChildren, useEffect, useMemo} from 'react';
import {createPerformance} from '@quilted/performance';
import type {Performance} from '@quilted/performance';
import {useRouter} from '@quilted/react-router';

import {PerformanceContextInternal} from './context';

export interface Props {
  performance?: Performance;
}

export function PerformanceContext({
  children,
  performance: explicitPerformance,
}: PropsWithChildren<Props>) {
  const router = useRouter();

  const performance = useMemo(() => {
    const performance = explicitPerformance ?? createPerformance();
    performance.start({target: router.currentUrl});
    return performance;
  }, [explicitPerformance, router]);

  useEffect(() => {
    const stopListening = router.listen((url) => {
      performance.start({target: url});
    });

    return () => {
      stopListening();
      performance.currentNavigation?.cancel();
    };
  }, [router, performance]);

  return (
    <PerformanceContextInternal.Provider value={performance}>
      {children}
    </PerformanceContextInternal.Provider>
  );
}
