import {useEffect} from 'react';
import type {NavigateTo} from '../types';

import {useRouter} from './router';
import {useCurrentUrl} from './url';

export function useRedirect(to: NavigateTo) {
  const router = useRouter();
  const currentUrl = useCurrentUrl();

  useEffect(() => {
    router.navigate(to, {replace: true});
  }, [router, to, currentUrl]);
}
