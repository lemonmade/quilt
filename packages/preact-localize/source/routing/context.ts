import {useNavigation} from '@quilted/preact-router';

import {LocalizedNavigation} from './LocalizedNavigation.tsx';
import type {ResolvedRouteLocalization} from './types.ts';

export function useRouteLocalization(): ResolvedRouteLocalization {
  const navigation = useNavigation();

  if (!(navigation instanceof LocalizedNavigation)) {
    throw new Error(
      'useRouteLocalization() requires a LocalizedNavigation instance to be provided in context. ' +
        'Make sure you are passing a LocalizedNavigation to QuiltFrameworkContext.',
    );
  }

  return navigation.routes;
}
