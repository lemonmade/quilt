import React, {memo, useState, useEffect, useRef, useMemo} from 'react';
import {useSerialized} from '@quilted/react-html';

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
  const routerRef = useRef<RouterControl>(undefined as any);

  const routerState = useSerialized('router', () =>
    routerRef.current[EXTRACT](),
  );

  const router = useMemo(
    () =>
      new RouterControl(explicitUrl, {
        prefix,
        state: routerState,
      }),
    [explicitUrl, prefix, routerState],
  );

  routerRef.current = router;

  const [url, setUrl] = useState(router.currentUrl);

  useEffect(() => router.listen((newUrl) => setUrl(newUrl)), [router]);

  return (
    <RouterContext.Provider value={routerRef.current}>
      <CurrentUrlContext.Provider value={url}>
        <Prefetcher />
        <FocusContext>{children}</FocusContext>
      </CurrentUrlContext.Provider>
    </RouterContext.Provider>
  );
});
