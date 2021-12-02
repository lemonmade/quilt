import {useEffect} from 'react';
import type {NavigationBlocker} from '../types';
import {useRouter} from './router';

export function useNavigationBlock(blocker?: NavigationBlocker) {
  const router = useRouter();

  useEffect(() => {
    return router.block(blocker);
  }, [router, blocker]);
}
