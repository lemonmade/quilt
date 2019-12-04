import * as React from 'react';
import {useSerialized} from '@quilted/react-html';

import {CurrentUrlContext, RouterContext} from '../../context';
import {Router as RouterControl, State, EXTRACT, LISTEN} from '../../router';
import {Prefetcher} from '../Prefetcher';

interface Props {
  url?: URL;
  children?: React.ReactNode;
}

export function Router({children, url: explicitUrl}: Props) {
  const [url, setUrl] = React.useState(
    () => explicitUrl || getUrlFromBrowser(),
  );

  const [routerState, Serialize] = useSerialized<State>('router');

  // should useRef instead
  const router = React.useMemo(() => new RouterControl(url, routerState), [
    routerState,
    url,
  ]);

  React.useEffect(() => router[LISTEN]((newUrl) => setUrl(newUrl)), [
    router,
    setUrl,
  ]);

  return (
    <>
      <RouterContext.Provider value={router}>
        <CurrentUrlContext.Provider value={url}>
          <Prefetcher />
          {children}
        </CurrentUrlContext.Provider>
      </RouterContext.Provider>
      <Serialize data={() => router[EXTRACT]()} />
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
