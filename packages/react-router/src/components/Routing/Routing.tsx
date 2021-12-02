import {
  memo,
  useState,
  useEffect,
  useRef,
  useMemo,
  PropsWithChildren,
  createRef,
} from 'react';
import type {ReactNode} from 'react';

import {useIsomorphicEffect} from '../../hooks/effect';
import {
  CurrentUrlContext,
  FocusRefContext,
  RouterContext,
  ScrollRestorationRegistrarContext,
} from '../../context';
import {createRouter} from '../../router';
import type {Router, Options as RouterOptions} from '../../router';
import {
  Focusable,
  EnhancedURL,
  RouteChangeScrollRestorationCache,
  RouteChangeScrollRestorationRegistrar,
  RouteChangeScrollRestorationRegistration,
  RouteChangeScrollRestorationHandler,
} from '../../types';
import {createSessionStorageScrollRestoration} from '../../scroll-restoration';
import {ROOT_SCROLL_RESTORATION_ID} from '../../constants';

interface Props extends RouterOptions {
  url?: URL;
  router?: Router;
  children?: ReactNode;
  scrollRestoration?: RouteChangeScrollRestorationCache | false;
}

export const Routing = memo(function Routing({
  children,
  url: explicitUrl,
  router: explicitRouter,
  prefix,
  state,
  isExternal,
  scrollRestoration: explicitScrollRestoration,
}: Props) {
  const router = useMemo(
    () =>
      explicitRouter ?? createRouter(explicitUrl, {prefix, state, isExternal}),
    [explicitRouter, explicitUrl, prefix, state, isExternal],
  );
  const [url, setUrl] = useState(router.currentUrl);
  const currentUrlRef = useRef(url);
  currentUrlRef.current = url;

  const scrollRestoration = useMemo(
    () => explicitScrollRestoration ?? createSessionStorageScrollRestoration(),
    [explicitScrollRestoration],
  );

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
        <FocusContext currentUrl={url}>
          {scrollRestoration ? (
            <ScrollRestorationContext
              currentUrl={url}
              restorer={scrollRestoration}
            >
              {children}
            </ScrollRestorationContext>
          ) : (
            children
          )}
        </FocusContext>
      </CurrentUrlContext.Provider>
    </RouterContext.Provider>
  );
});

function FocusContext({
  children,
  currentUrl,
}: PropsWithChildren<{currentUrl: URL}>) {
  const focusRef = useRef<Focusable>();
  const focus = () => {
    const target = focusRef.current ?? document.body;
    target.focus();
  };

  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
    } else {
      focus();
    }
  }, [currentUrl.pathname]);

  return (
    <FocusRefContext.Provider value={focusRef}>
      {children}
    </FocusRefContext.Provider>
  );
}

function ScrollRestorationContext({
  restorer,
  currentUrl,
  children,
}: PropsWithChildren<{
  currentUrl: EnhancedURL;
  restorer: RouteChangeScrollRestorationCache;
}>) {
  const previousUrlRef = useRef<undefined | EnhancedURL>();
  const registrar = useMemo<RouteChangeScrollRestorationRegistrar>(() => {
    const registrations = new Map<
      string,
      RouteChangeScrollRestorationRegistration
    >([[ROOT_SCROLL_RESTORATION_ID, {ref: createRef()}]]);

    return {
      get(id) {
        const existing = registrations.get(id);

        if (existing) return existing;

        const registration: RouteChangeScrollRestorationRegistration = {
          ref: createRef(),
        };

        registrations.set(id, registration);

        return registration;
      },
      [Symbol.iterator]() {
        return registrations[Symbol.iterator]();
      },
    };
  }, []);

  useIsomorphicEffect(() => {
    const targetUrl = currentUrl;
    const previousUrl = previousUrlRef.current;
    previousUrlRef.current = targetUrl;

    for (const [id, registration] of registrar) {
      const target = getTarget(id, registration);

      // This usually means an old registration that has since been
      // unmounted
      if (target == null) continue;

      const restore = () => {
        if (previousUrlRef.current?.key !== targetUrl.key) return;

        const scroll = restorer.get(ROOT_SCROLL_RESTORATION_ID, currentUrl);

        if (scroll != null) target.scrollTop = scroll;
      };

      const handler = registration.handler ?? defaultScrollRestorationHandler;
      const shouldInclude = handler({previousUrl, targetUrl, restore});

      if (shouldInclude) restore();
    }

    return () => {
      for (const [id, registration] of registrar) {
        const target = getTarget(id, registration);

        if (target == null) continue;

        restorer.set(id, currentUrl, target.scrollTop);
      }
    };
  }, [currentUrl.key]);

  return (
    <ScrollRestorationRegistrarContext.Provider value={registrar}>
      {children}
    </ScrollRestorationRegistrarContext.Provider>
  );
}

function getTarget(
  id: string,
  registration: RouteChangeScrollRestorationRegistration,
) {
  return id === ROOT_SCROLL_RESTORATION_ID
    ? registration.ref.current ?? document.documentElement
    : registration.ref.current;
}

// By default, we restore scroll whenever we change the actual route. This
// prevents scrolling when only query parameters are changed.
const defaultScrollRestorationHandler: RouteChangeScrollRestorationHandler = ({
  previousUrl,
  targetUrl,
}) => previousUrl == null || targetUrl.pathname !== previousUrl.pathname;
