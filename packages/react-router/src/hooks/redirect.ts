import {useEffect} from 'react';
import type {NavigateTo} from '../types';

import {useNavigate} from './navigate';

export function useRedirect(to: NavigateTo) {
  const navigate = useNavigate();

  useEffect(() => {
    navigate(to, {replace: true});
  }, [navigate, to]);
}
