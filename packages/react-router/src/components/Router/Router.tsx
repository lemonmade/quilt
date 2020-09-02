import React, {memo, useState, useEffect, useRef, useMemo} from 'react';
import type {ReactNode} from 'react';

import {FocusContext} from '../FocusContext';
import {CurrentUrlContext, RouterContext} from '../../context';
import type {Prefix} from '../../types';
import {createRouter} from '../../router';
import type {Router as RouterControl} from '../../router';

interface Props {
  url?: URL;
  prefix?: Prefix;
  router?: RouterControl;
  children?: ReactNode;
}

export const Router = memo(function Router({
  children,
  url: explicitUrl,
  router: explicitRouter,
  prefix,
}: Props) {
  const router = useMemo(
    () => explicitRouter ?? createRouter(explicitUrl, {prefix}),
    [explicitRouter, explicitUrl, prefix],
  );
  const [url, setUrl] = useState(router.currentUrl);
  const currentUrlRef = useRef(url);
  currentUrlRef.current = url;

  useEffect(() => {
    // currentUrl changed before the effect had the chance to run, so we need
    // to set state now for that URL change to be reflected in the app.
    if (currentUrlRef.current !== router.currentUrl) {
      setUrl(router.currentUrl);
    }

    return router.listen((newUrl) => setUrl(newUrl));
  }, [router]);

  return (
    <RouterContext.Provider value={router}>
      <CurrentUrlContext.Provider value={url}>
        <FocusContext>{children}</FocusContext>
      </CurrentUrlContext.Provider>
    </RouterContext.Provider>
  );
});
