import {useEffect} from 'react';

import {useRouter} from '../../hooks';
import {NavigateTo} from '../../router';

interface Props {
  to: NavigateTo;
}

export function Redirect({to}: Props) {
  const router = useRouter();

  useEffect(() => {
    router.navigate(to, {replace: true});
  }, [router, to]);

  return null;
}
