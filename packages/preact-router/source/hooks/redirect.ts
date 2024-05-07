import {useEffect} from 'preact/hooks';
import type {StatusCode} from '@quilted/http';
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

  if (typeof document === 'undefined') {
    throw new Response(null, {
      status: statusCode ?? 308,
      headers: {Location: router.resolve(to, {relativeTo}).url.href},
    });
  }

  useEffect(() => {
    router.navigate(to, {replace: true, relativeTo});
  }, [router, relativeTo, to]);
}
