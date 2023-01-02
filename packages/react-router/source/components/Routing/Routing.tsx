import {
  memo,
  useState,
  useEffect,
  useRef,
  useMemo,
  type ReactNode,
} from 'react';
import {usePerformance} from '@quilted/react-performance';

import {FocusContext} from '../FocusContext';
import {CurrentUrlContext, RouterContext} from '../../context';
import {createRouter} from '../../router';
import type {Router, Options as RouterOptions} from '../../router';
import {useInitialUrl} from '../../hooks';

interface Props extends RouterOptions {
  url?: URL;
  router?: Router;
  children?: ReactNode;
}

export const Routing = memo(function Routing({
  children,
  url: explicitUrl,
  router: explicitRouter,
  prefix,
  state,
  isExternal,
}: Props) {
  const initialUrl = useInitialUrl();

  const router = useMemo(
    () =>
      explicitRouter ??
      createRouter(explicitUrl ?? initialUrl, {prefix, state, isExternal}),
    [explicitRouter, explicitUrl, initialUrl, prefix, state, isExternal],
  );
  const [url, setUrl] = useState(router.currentUrl);

  const currentUrlRef = useRef(url);
  currentUrlRef.current = url;

  const performance = usePerformance({required: false});

  useEffect(() => {
    if (performance == null || typeof globalThis.performance === 'undefined') {
      return;
    }

    performance.start({
      at: globalThis.performance.timeOrigin,
      target: router.currentUrl,
    });

    const stopListening = router.listen((url) => {
      performance.start({target: url});
    });

    return () => {
      stopListening();
      performance.currentNavigation?.cancel();
    };
  }, [router, performance]);

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
