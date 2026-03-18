import type {RenderableProps} from 'preact';
import {useContext, useMemo} from 'preact/hooks';
import {createPerformance, type Performance} from '@quilted/performance';
import {QuiltFrameworkContextPreact} from '@quilted/preact-context';

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

  const existingContext = useContext(QuiltFrameworkContextPreact);
  const newContext = useMemo(
    () => ({...existingContext, performance}),
    [existingContext, performance],
  );

  return (
    <QuiltFrameworkContextPreact.Provider value={newContext}>
      {children}
    </QuiltFrameworkContextPreact.Provider>
  );
}
