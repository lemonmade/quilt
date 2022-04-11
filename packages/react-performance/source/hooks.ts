import {useContext, useEffect} from 'react';
import {PerformanceContextInternal} from './context';

export function usePerformance() {
  return useContext(PerformanceContextInternal) ?? undefined;
}

export interface PerformanceNavigationOptions {
  stage: 'loading' | 'usable' | 'complete';
}

export function usePerformanceNavigation(
  {stage}: PerformanceNavigationOptions = {stage: 'complete'},
) {
  const performance = usePerformance();

  useEffect(() => {
    const currentNavigation = performance?.currentNavigation;

    if (currentNavigation == null) return;

    switch (stage) {
      case 'complete':
        currentNavigation.end();
        break;
    }
  }, [stage, performance]);
}
