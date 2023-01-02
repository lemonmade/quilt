import {useContext} from 'react';
import {RouterContext} from '../context';

export function useRouter() {
  const router = useContext(RouterContext);

  if (router == null) {
    throw new Error(
      'You attempted to use the current router, but none was found. Make sure your code is nested in a <Routing /> component',
    );
  }

  return router;
}
