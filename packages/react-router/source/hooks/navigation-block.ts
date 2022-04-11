import {useEffect} from 'react';
import type {Blocker} from '../types';
import {useRouter} from './router';

export function useNavigationBlock(blocker?: Blocker) {
  const router = useRouter();

  useEffect(() => {
    return router.block(blocker);
  }, [router, blocker]);
}
