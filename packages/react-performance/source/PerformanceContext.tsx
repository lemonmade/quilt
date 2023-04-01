import {PropsWithChildren, useMemo} from 'react';
import {createPerformance} from '@quilted/performance';
import type {Performance} from '@quilted/performance';

import {PerformanceContextInternal} from './context.ts';

export interface Props {
  performance?: Performance;
}

export function PerformanceContext({
  children,
  performance: explicitPerformance,
}: PropsWithChildren<Props>) {
  const performance = useMemo(
    () => explicitPerformance ?? createPerformance(),
    [explicitPerformance],
  );

  return (
    <PerformanceContextInternal.Provider value={performance}>
      {children}
    </PerformanceContextInternal.Provider>
  );
}
