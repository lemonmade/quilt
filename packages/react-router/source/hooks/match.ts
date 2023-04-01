import {getMatchDetails} from '@quilted/routing';
import type {Match} from '@quilted/routing';

import {useRouter} from './router.ts';
import {useCurrentUrl} from './url.ts';
import {useConsumedPath} from './consumed.ts';

export interface RouteMatchOptions {
  exact?: boolean;
}

export function useRouteMatchDetails(
  match: Match,
  {exact}: RouteMatchOptions = {},
) {
  const router = useRouter();
  const currentUrl = useCurrentUrl();
  const consumedPath = useConsumedPath();

  return getMatchDetails(currentUrl, match, router.prefix, consumedPath, exact);
}

export function useRouteMatch(match: Match, options?: RouteMatchOptions) {
  return useRouteMatchDetails(match, options) != null;
}
