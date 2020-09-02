import {useCallback} from 'react';
import type {Router} from '../router';
import {useRouter} from './router';

export function useNavigate() {
  const router = useRouter();

  return useCallback<Router['navigate']>(
    (...args) => {
      return router.navigate(...args);
    },
    [router],
  );
}
