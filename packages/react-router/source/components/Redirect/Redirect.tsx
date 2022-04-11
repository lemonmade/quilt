import type {StatusCode} from '@quilted/react-http';
import type {NavigateTo, RelativeTo} from '@quilted/routing';

import {useRedirect} from '../../hooks';

interface Props {
  to: NavigateTo;
  relativeTo?: RelativeTo;
  statusCode?: StatusCode;
}

export function Redirect({to, relativeTo, statusCode}: Props) {
  useRedirect(to, {relativeTo, statusCode});
  return null;
}
