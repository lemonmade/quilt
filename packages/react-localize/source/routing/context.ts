import {
  createUseContextHook,
  createOptionalContext,
} from '@quilted/react-utilities';

import type {ResolvedRouteLocalization} from './types';

export const RouteLocalizationContext =
  createOptionalContext<ResolvedRouteLocalization>();

export const useRouteLocalization = createUseContextHook(
  RouteLocalizationContext,
);
