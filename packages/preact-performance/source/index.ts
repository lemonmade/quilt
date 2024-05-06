export {createPerformance} from '@quilted/performance';
export type {
  Performance,
  PerformanceNavigation,
  PerformanceInflightNavigation,
} from '@quilted/performance';

export {usePerformance} from './hooks/performance.ts';
export {
  usePerformanceNavigation,
  type PerformanceNavigationOptions,
  type PerformanceNavigationOptionsComplete,
  type PerformanceNavigationOptionsLoading,
} from './hooks/navigation.ts';
export {usePerformanceNavigationEvent} from './hooks/navigation-event.ts';

export {PerformanceContext} from './PerformanceContext.tsx';
