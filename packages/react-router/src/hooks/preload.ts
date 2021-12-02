import {useContext, useEffect} from 'react';
import {PreloaderContext} from '../context';
import type {NavigateTo} from '../types';
import {useRouter} from './router';

export function useRoutePreloader() {
  return useContext(PreloaderContext) ?? undefined;
}

export function usePreloadRoute(to?: NavigateTo | false) {
  const router = useRouter();
  const preloader = useRoutePreloader();

  if (preloader == null) {
    throw new Error(
      `Route-based preloading is not enabled. Make sure this component is rendered inside a <RoutePreloading> component`,
    );
  }

  useEffect(() => {
    if (!to) return;

    const {url, external} = router.resolve(to);

    if (external) {
      throw new Error(`Can’t preload external route: ${url.href}`);
    }

    return preloader.add(url);
  }, [to, router, preloader]);
}
