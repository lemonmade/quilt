import type {RenderableProps} from 'preact';
import {useMemo} from 'preact/hooks';
import {createPerformance, type Performance} from '@quilted/performance';

import {PerformanceContextInternal} from './context.ts';

export interface Props {
  performance?: Performance;
}

export function PerformanceContext({
  children,
  performance: explicitPerformance,
}: RenderableProps<Props>) {
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
