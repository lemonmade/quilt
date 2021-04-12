import type {Match} from '@quilted/routing';

import {getMatchDetails} from '../utilities';

import {useRouter} from './router';
import {useCurrentUrl} from './url';
import {useConsumedPath} from './consumed';

export function useMatch(match: Match) {
  const router = useRouter();
  const currentUrl = useCurrentUrl();
  const consumedPath = useConsumedPath();

  return getMatchDetails(currentUrl, router, consumedPath, match) != null;
}
