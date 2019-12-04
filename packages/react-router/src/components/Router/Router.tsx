import React, {useState, useEffect, useRef} from 'react';
import {useSerialized} from '@quilted/react-html';

import {CurrentUrlContext, RouterContext} from '../../context';
import {Router as RouterControl, EXTRACT, LISTEN} from '../../router';
import {Prefetcher} from '../Prefetcher';

interface Props {
  url?: URL;
  children?: React.ReactNode;
}

export function Router({children, url: explicitUrl}: Props) {
  const [url, setUrl] = useState(() => explicitUrl || getUrlFromBrowser());
  const routerRef = useRef<RouterControl>(null as any);
  const routerState = useSerialized('router', () =>
    routerRef.current[EXTRACT](),
  );

  if (routerRef.current == null) {
    routerRef.current = new RouterControl(url, routerState);
  }

  useEffect(() => routerRef.current[LISTEN]((newUrl) => setUrl(newUrl)), []);

  return (
    <>
      <RouterContext.Provider value={routerRef.current}>
        <CurrentUrlContext.Provider value={url}>
          <Prefetcher />
          {children}
        </CurrentUrlContext.Provider>
      </RouterContext.Provider>
    </>
  );
}

function getUrlFromBrowser() {
  if (typeof window === 'undefined') {
    throw new Error(
      'You did not provide a `url` prop to the `Router`. On the server, you must explicitly provide prop, as there is no way to determine it programatically.',
    );
  }

  return new URL(window.location.href);
}
