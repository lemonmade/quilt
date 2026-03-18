import {useQuiltContext} from '@quilted/preact-context';

export function useNavigation() {
  return useQuiltContext('navigation');
}
