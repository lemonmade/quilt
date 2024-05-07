import {useCallback} from 'preact/hooks';

import type {Router} from '../router.ts';
import {useRouter} from './router.ts';

export function useNavigate() {
  const router = useRouter();

  return useCallback<Router['navigate']>(
    (...args) => {
      return router.navigate(...args);
    },
    [router],
  );
}
