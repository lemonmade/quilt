import {useContext} from 'react';
import type {SWRConfiguration, Fetcher as SWRFetcher} from 'swr';
import {useServerAction} from '@quilted/quilt';

import {SWRServerRendererContext} from '../server-render';

declare module 'swr/dist/types' {
  export interface PublicConfiguration {
    /**
     * Whether to fetch this query during server rendering.
     */
    server?: boolean;
  }
}

export function useServerRenderedSWR(
  key: any,
  fetcherOrOptions?: any,
  optionsOrNothing?: any,
) {
  const serverRenderer = useContext(SWRServerRendererContext);

  useServerAction(() => {
    if (serverRenderer == null) return;

    let options: SWRConfiguration | undefined;
    let fetcher: SWRFetcher | undefined = fetcherOrOptions;

    if (typeof fetcherOrOptions === 'object') {
      options = fetcherOrOptions;
      fetcher = undefined;
    } else if (typeof optionsOrNothing === 'object') {
      options = optionsOrNothing;
    }

    if (fetcher == null || !(options?.server ?? true)) return;

    serverRenderer.run(key, fetcher);
  }, serverRenderer?.kind);
}
