import {createContext} from 'react';
import type {Performance} from '@quilted/performance';

export const PerformanceContextInternal = createContext<Performance | null>(
  null,
);
