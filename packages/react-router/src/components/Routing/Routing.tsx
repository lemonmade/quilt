import {memo, useState, useEffect, useRef, useMemo, createRef} from 'react';
import type {ReactNode} from 'react';
import type {PropsWithChildren} from '@quilted/useful-react-types';

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
import {useCurrentUrl} from '../../hooks';

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
  const router = useMemo(() => {
    return (
      explicitRouter ?? createRouter(explicitUrl, {prefix, state, isExternal})
    );
  }, [explicitRouter, explicitUrl, prefix, state, isExternal]);

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
        <FocusContext>
          {scrollRestoration ? (
            <ScrollRestorationContext restorer={scrollRestoration}>
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

function FocusContext({children}: PropsWithChildren) {
  const focusRef = useRef<Focusable>();
  const currentUrl = useCurrentUrl();

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
  children,
}: PropsWithChildren<{
  restorer: RouteChangeScrollRestorationCache;
}>) {
  const currentUrl = useCurrentUrl();
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
  const countRef = useRef(0);

  useIsomorphicEffect(() => {
    const count = countRef.current;
    console.log(`SCROLL RESTORE START ${count}`);
    countRef.current += 1;

    const targetUrl = currentUrl;
    const previousUrl = previousUrlRef.current;
    previousUrlRef.current = targetUrl;

    for (const [id, registration] of registrar) {
      const target = getTarget(id, registration);

      if (target == null) console.log(`Unable to restore ${id}`);

      // This usually means an old registration that has since been
      // unmounted
      if (target == null) continue;

      const restore = () => {
        if (previousUrlRef.current?.key !== targetUrl.key) return;

        const scroll = restorer.get(id, targetUrl) ?? 0;
        console.log({
          RESTORE: true,
          id,
          currentUrl: targetUrl.href,
          currentKey: targetUrl.key,
          scroll,
          target: target?.innerHTML,
        });

        target.scrollTop = scroll;
      };

      const handler = registration.handler ?? defaultScrollRestorationHandler;
      const shouldInclude = handler({previousUrl, targetUrl, restore});

      if (shouldInclude) restore();
    }

    return () => {
      console.log(`SCROLL RESTORE TEARDOWN ${count}`);
      for (const [id, registration] of registrar) {
        const target = getTarget(id, registration);

        if (target == null) continue;

        console.log({
          SAVE: true,
          id,
          currentUrl: targetUrl.href,
          currentKey: targetUrl.key,
          scroll: target.scrollTop,
        });

        restorer.set(id, targetUrl, target.scrollTop);
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
