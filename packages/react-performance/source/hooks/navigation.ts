import {useEffect} from 'react';
import {usePerformance} from './performance.ts';

export interface PerformanceNavigationOptionsComplete {
  state?: 'complete';
  metadata?: Record<string, unknown>;
}

export interface PerformanceNavigationOptionsLoading {
  state?: 'loading';
  metadata?: never;
}

export type PerformanceNavigationOptions =
  | PerformanceNavigationOptionsLoading
  | PerformanceNavigationOptionsComplete;

export function usePerformanceNavigation({
  state = 'complete',
  metadata,
  required = true,
}: PerformanceNavigationOptions & {required?: boolean} = {}) {
  const performance = usePerformance({required: required as false});

  useEffect(() => {
    const currentNavigation = performance?.currentNavigation;

    if (currentNavigation == null) return;

    switch (state) {
      case 'complete':
        currentNavigation.end({metadata});
        break;
    }
  }, [state, performance]);
}
