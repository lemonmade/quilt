import {createOptionalContext} from '@quilted/preact-context';

import type {ResolvedRouteLocalization} from './types.ts';

export const RouteLocalizationContext =
  createOptionalContext<ResolvedRouteLocalization>();

export const useRouteLocalization = RouteLocalizationContext.use;
