import {useEffect} from 'react';
import {Blocker} from '../router';
import {useRouter} from './router';

export function useNavigationBlock(blocker?: Blocker) {
  const router = useRouter();

  useEffect(() => {
    return router.block(blocker);
  }, [router, blocker]);
}
