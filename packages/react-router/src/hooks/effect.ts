import {useLayoutEffect} from 'react';

export const useIsomorphicEffect =
  typeof window === 'undefined' ? noop : useLayoutEffect;

// eslint-disable-next-line @typescript-eslint/no-empty-function
function noop() {}
