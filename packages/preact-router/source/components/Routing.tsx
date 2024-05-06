import type {ComponentChildren} from 'preact';
import {useState, useEffect, useRef, useMemo} from 'preact/hooks';
import {usePerformance} from '@quilted/preact-performance';

import {CurrentUrlContext, RouterContext} from '../context.ts';
import {
  createRouter,
  type Router,
  type Options as RouterOptions,
} from '../router.ts';
import type {Routes} from '../types.ts';

import {useRoutes} from '../hooks/routes.tsx';
import {useInitialURL} from '../hooks/initial-url.ts';

import {FocusContext} from './FocusContext.tsx';

interface Props extends RouterOptions {
  url?: URL;
  routes?: Routes;
  router?: Router;
  children?: ComponentChildren;
}

export function Routing({
  children,
  url: explicitUrl,
  router: explicitRouter,
  routes,
  prefix,
  state,
  isExternal,
}: Props) {
  const initialUrl = useInitialURL();

  const router = useMemo(
    () =>
      explicitRouter ??
      createRouter(explicitUrl ?? initialUrl, {prefix, state, isExternal}),
    [explicitRouter, explicitUrl, initialUrl, prefix, state, isExternal],
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
        <Performance router={router} />
        <FocusContext>
          {children}
          {routes ? <StaticRoutes routes={routes} /> : null}
        </FocusContext>
      </CurrentUrlContext.Provider>
    </RouterContext.Provider>
  );
}

// We put this in a dedicated component to ensure its effects run before any siblings.
// This is important because sibling components may mark a navigation as completed, so
// we need to start the very first navigation before any of them do.
function Performance({router}: {router: Router}) {
  const performance = usePerformance({optional: true});

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

  return null;
}

function StaticRoutes({routes}: {routes: Routes}) {
  return useRoutes(routes);
}
