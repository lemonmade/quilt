import type {Performance} from '@quilted/performance';
import {useQuiltContext} from '@quilted/preact-context';

declare module '@quilted/preact-context' {
  interface QuiltContext {
    /**
     * The performance monitoring context for your application. The `Performance`
     * object tracks navigation timings and lets you record custom performance
     * events for server-side rendering and client-side transitions.
     *
     */
    readonly performance?: Performance;
  }
}

export function usePerformanceFromContext(): Performance;
export function usePerformanceFromContext(options: {
  optional: boolean;
}): Performance | undefined;
export function usePerformanceFromContext(options?: {
  optional?: boolean;
}): Performance | undefined {
  return useQuiltContext('performance', options as any);
}
