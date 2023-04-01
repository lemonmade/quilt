import {useEffect} from 'react';
import {useHttpAction} from '@quilted/react-http';
import type {StatusCode} from '@quilted/react-http';
import type {NavigateTo} from '@quilted/routing';

import type {NavigateOptions} from '../router.ts';

import {useRouter} from './router.ts';

export interface Options extends Pick<NavigateOptions, 'relativeTo'> {
  statusCode?: StatusCode;
}

export function useRedirect(
  to: NavigateTo,
  {relativeTo, statusCode}: Options = {},
) {
  const router = useRouter();

  useHttpAction((http) => {
    http.redirectTo(router.resolve(to, {relativeTo}).url.href, statusCode);
  });

  useEffect(() => {
    router.navigate(to, {replace: true, relativeTo});
  }, [router, relativeTo, to]);
}
