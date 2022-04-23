import {createContext} from 'react';
import {createUseContextHook} from '@quilted/react-utilities';

import type {ResolvedRouteLocalization} from './types';

export const RouteLocalizationContext =
  createContext<ResolvedRouteLocalization | null>(null);

export const useRouteLocalization = createUseContextHook(
  RouteLocalizationContext,
);
