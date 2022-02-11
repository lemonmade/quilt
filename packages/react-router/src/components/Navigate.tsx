import type {NavigateTo, RelativeTo} from '@quilted/routing';
import {useEffect} from 'react';

import {useNavigate} from '../hooks';
import type {State} from '../types';

interface Props {
  to: NavigateTo;
  state?: State;
  relativeTo?: RelativeTo;
}

export function Navigate({to, relativeTo, state}: Props) {
  const navigate = useNavigate();

  useEffect(() => {
    navigate(to, {relativeTo, state});
  }, [to, navigate, relativeTo, state]);

  return null;
}
