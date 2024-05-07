import {useEffect} from 'preact/hooks';

import type {Blocker} from '../types.ts';
import {useRouter} from './router.ts';

export function useNavigationBlock(blocker?: Blocker) {
  const router = useRouter();

  useEffect(() => {
    return router.block(blocker);
  }, [router, blocker]);
}
