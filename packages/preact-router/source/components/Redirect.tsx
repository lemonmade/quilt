import type {NavigateTo} from '@quilted/routing';
import {useRouter} from '../hooks/router.ts';

export interface RedirectProps {
  to: NavigateTo;
}

export function Redirect({to}: RedirectProps) {
  const router = useRouter();

  throw new Response(null, {
    status: 302,
    headers: {
      Location: router.resolve(to).url.href,
    },
  });

  return null;
}
