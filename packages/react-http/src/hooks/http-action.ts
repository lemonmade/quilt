import {useContext} from 'react';
import {useServerAction} from '@quilted/react-server-render';

import {HttpContext} from '../context';
import type {HttpManager} from '../manager';

export function useHttpAction(perform: (http: HttpManager) => void) {
  const http = useContext(HttpContext);

  useServerAction(() => {
    if (http) perform(http);
  }, http?.actionKind);
}
