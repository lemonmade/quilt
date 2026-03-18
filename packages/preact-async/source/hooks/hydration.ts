import {useQuiltContext} from '@quilted/preact-context';

export function useHydrated() {
  return useQuiltContext('async', {optional: true})?.isHydrated ?? true;
}
