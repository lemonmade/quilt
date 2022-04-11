import {getMatchDetails} from '@quilted/routing';
import type {Match} from '@quilted/routing';

import {useRouter} from './router';
import {useCurrentUrl} from './url';
import {useConsumedPath} from './consumed';

export function useMatch(match: Match) {
  const router = useRouter();
  const currentUrl = useCurrentUrl();
  const consumedPath = useConsumedPath();

  return (
    getMatchDetails(currentUrl, match, router.prefix, consumedPath, false) !=
    null
  );
}
