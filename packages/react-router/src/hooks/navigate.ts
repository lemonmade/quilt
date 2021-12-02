import {useCallback} from 'react';
import type {Router} from '../router';
import {useRouter} from './router';

/**
 * Returns a function that can be used to navigate programmatically.
 * If you are navigating in response to the user clicking on an element,
 * you should use the `<Link />` component instead, which renders a
 * native HTML `<a>` element that works even when JavaScript is disabled
 * or broken.
 */
export function useNavigate() {
  const router = useRouter();

  return useCallback<Router['navigate']>(
    (...args) => {
      return router.navigate(...args);
    },
    [router],
  );
}
