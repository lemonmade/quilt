import type {Performance} from '@quilted/performance';
import {usePerformanceFromContext} from '../context.ts';

export function usePerformance(): Performance;
export function usePerformance(options: {
  optional: boolean;
}): Performance | undefined;
export function usePerformance(options?: {
  optional?: boolean;
}): Performance | undefined {
  return usePerformanceFromContext(options as any);
}
