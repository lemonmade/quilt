import {createUseContextHook} from '@quilted/react-utilities';
import {PerformanceContextInternal} from '../context.ts';

export const usePerformance = createUseContextHook(PerformanceContextInternal);
