import {useMemo} from 'react';

import {resolveMatch} from '../utilities';
import type {Match} from '../types';

import {useCurrentUrl} from './url';

export function useMatch(match: Match) {
  const currentUrl = useCurrentUrl();
  return useMemo(() => resolveMatch(currentUrl, match), [currentUrl, match]);
}
