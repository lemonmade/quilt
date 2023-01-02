import {useEffect} from 'react';
import {usePerformance} from './performance';

export interface PerformanceNavigationOptionsComplete {
  state: 'complete';
  metadata?: Record<string, unknown>;
}

export interface PerformanceNavigationOptionsLoading {
  state: 'loading';
  metadata?: never;
}

export type PerformanceNavigationOptions =
  | PerformanceNavigationOptionsLoading
  | PerformanceNavigationOptionsComplete;

export function usePerformanceNavigation(
  {state, metadata}: PerformanceNavigationOptions = {state: 'complete'},
) {
  const performance = usePerformance();

  useEffect(() => {
    const currentNavigation = performance.currentNavigation;

    if (currentNavigation == null) return;

    switch (state) {
      case 'complete':
        currentNavigation.end({metadata});
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, performance]);
}
