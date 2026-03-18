import type {NavigateTo} from '@quilted/routing';
import {useNavigation} from '../hooks/navigation.ts';

export interface RedirectProps {
  to: NavigateTo;
}

export function Redirect({to}: RedirectProps) {
  const navigation = useNavigation();

  throw new Response(null, {
    status: 302,
    headers: {
      Location: navigation.resolve(to).url.href,
    },
  });

  return null;
}
