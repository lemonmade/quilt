import {memo, useState, useEffect, useRef, useMemo} from 'react';
import type {ReactNode} from 'react';

import {FocusContext} from '../FocusContext';
import {CurrentUrlContext, RouterContext} from '../../context';
import {createRouter} from '../../router';
import type {
  Router as RouterControl,
  Options as RouterOptions,
} from '../../router';

interface Props extends RouterOptions {
  url?: URL;
  router?: RouterControl;
  children?: ReactNode;
}

export const Router = memo(function Router({
  children,
  url: explicitUrl,
  router: explicitRouter,
  prefix,
  state,
  isExternal,
}: Props) {
  const router = useMemo(
    () =>
      explicitRouter ?? createRouter(explicitUrl, {prefix, state, isExternal}),
    [explicitRouter, explicitUrl, prefix, state, isExternal],
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
