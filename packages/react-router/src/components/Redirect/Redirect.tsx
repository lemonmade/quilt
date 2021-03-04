import {useRedirect} from '../../hooks';
import type {NavigateTo, RelativeTo} from '../../types';

interface Props {
  to: NavigateTo;
  relativeTo?: RelativeTo;
}

export function Redirect({to, relativeTo}: Props) {
  useRedirect(to, {relativeTo});
  return null;
}
