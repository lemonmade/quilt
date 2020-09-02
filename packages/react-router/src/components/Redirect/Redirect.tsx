import {useRedirect} from '../../hooks';
import type {NavigateTo} from '../../types';

interface Props {
  to: NavigateTo;
}

export function Redirect({to}: Props) {
  useRedirect(to);
  return null;
}
