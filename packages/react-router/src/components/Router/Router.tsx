import React, {memo, useState, useEffect, useRef, useMemo} from 'react';
import {useSerialized} from '@quilted/react-html';

import {EnhancedURL} from 'types';
import {FocusContext} from '../FocusContext';
import {CurrentUrlContext, RouterContext} from '../../context';
import {Router as RouterControl, EXTRACT} from '../../router';
import {Prefetcher} from '../Prefetcher';

interface Props {
  url?: URL;
  prefix?: string | RegExp;
  children?: React.ReactNode;
}

export const Router = memo(function Router({
  children,
  url: explicitUrl,
  prefix,
}: Props) {
  const internalsRef = useRef<{router: RouterControl; currentUrl: EnhancedURL}>(
    undefined as any,
  );

  const routerState = useSerialized('router', () =>
    internalsRef.current.router[EXTRACT](),
  );

  const router = useMemo(
    () =>
      new RouterControl(explicitUrl, {
        prefix,
        state: routerState,
      }),
    [explicitUrl, prefix, routerState],
  );

  internalsRef.current = {router, currentUrl: router.currentUrl};

  const [url, setUrl] = useState(router.currentUrl);

  useEffect(() => {
    // currentUrl changed before the effect had the chance to run, so we need
    // to set state now for that URL change to be reflected in the app.
    if (router.currentUrl !== internalsRef.current.currentUrl) {
      setUrl(router.currentUrl);
    }

    return router.listen((newUrl) => setUrl(newUrl));
  }, [router]);

  return (
    <RouterContext.Provider value={router}>
      <CurrentUrlContext.Provider value={url}>
        <Prefetcher />
        <FocusContext>{children}</FocusContext>
      </CurrentUrlContext.Provider>
    </RouterContext.Provider>
  );
});
