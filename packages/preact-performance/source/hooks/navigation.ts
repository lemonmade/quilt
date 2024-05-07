import {useEffect} from 'preact/hooks';
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
  optional = false,
}: PerformanceNavigationOptions & {optional?: boolean} = {}) {
  const performance = usePerformance({optional});

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
