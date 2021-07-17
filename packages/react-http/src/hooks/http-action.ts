import {useContext} from 'react';
import {useServerAction} from '@quilted/react-server-render';

import {HttpServerContext} from '../context';
import type {HttpManager} from '../manager';

/**
 * During server-side rendering, the function you pass to this hook is
 * called with the HTTP server-rendering manager, if one is found.
 * You typically shouldn’t need to call this hook directly, as all
 * of the individual actions you can perform on the HTTP manager are
 * exposed as dedicated hooks.
 */
export function useHttpAction(perform: (http: HttpManager) => void) {
  const http = useContext(HttpServerContext);

  useServerAction(() => {
    if (http) perform(http);
  }, http?.actionKind);
}
