import type {StatusCode} from '@quilted/react-http';
import {useRedirect} from '../../hooks';
import type {NavigateTo, RelativeTo} from '../../types';

interface Props {
  to: NavigateTo;
  relativeTo?: RelativeTo;
  statusCode?: StatusCode;
}

export function Redirect({to, relativeTo, statusCode}: Props) {
  useRedirect(to, {relativeTo, statusCode});
  return null;
}
