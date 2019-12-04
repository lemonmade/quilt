import {useContext, useLayoutEffect} from 'react';
import {Blocker} from './router';
import {CurrentUrlContext, RouterContext, SwitchContext} from './context';

export function useCurrentUrl() {
  const url = useContext(CurrentUrlContext);

  if (url == null) {
    throw new Error(
      'You attempted to use the current URL, but none was found. Make sure your code is nested in a <Router />',
    );
  }

  return url;
}

export function useRouter() {
  const router = useContext(RouterContext);

  if (router == null) {
    throw new Error(
      'You attempted to use the current router, but none was found. Make sure your code is nested in a <Router />',
    );
  }

  return router;
}

export function useNavigationBlock(blocker?: Blocker) {
  const router = useRouter();

  useLayoutEffect(() => {
    return router.block(blocker);
  }, [router, blocker]);
}

export function useSwitch() {
  return useContext(SwitchContext);
}
