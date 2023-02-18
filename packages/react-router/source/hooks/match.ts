import {getMatchDetails} from '@quilted/routing';
import type {Match} from '@quilted/routing';

import {useRouter} from './router';
import {useCurrentUrl} from './url';
import {useConsumedPath} from './consumed';

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
