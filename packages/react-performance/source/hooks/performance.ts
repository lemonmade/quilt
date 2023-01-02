import {createUseContextHook} from '@quilted/react-utilities';
import {PerformanceContextInternal} from '../context';

export const usePerformance = createUseContextHook(PerformanceContextInternal);
