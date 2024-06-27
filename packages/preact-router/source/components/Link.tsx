import type {JSX, RenderableProps} from 'preact';
import {useMemo} from 'preact/hooks';
import type {NavigateTo} from '@quilted/routing';
import {computed} from '@quilted/signals';

import {useRouter} from '../hooks/router.ts';

interface Props extends Omit<JSX.HTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: NavigateTo;
  external?: boolean;
}

export function Link({
  ref,
  children,
  to,
  onClick,
  external: explicitlyExternal = false,
  ...rest
}: RenderableProps<Props, HTMLAnchorElement>) {
  const router = useRouter();
  const currentOrigin = useMemo(
    () => computed(() => router.currentRequest.url.origin),
    [router],
  ).value;
  const {url, external} = router.resolve(to);

  const handleClick: JSX.MouseEventHandler<HTMLAnchorElement> = (event) => {
    onClick?.(event);

    if (
      explicitlyExternal ||
      external ||
      event.defaultPrevented ||
      event.shiftKey ||
      event.ctrlKey ||
      event.metaKey
    ) {
      return;
    }

    event.preventDefault();
    router.navigate(to);
  };

  const href =
    url.origin === currentOrigin ? url.href.slice(url.origin.length) : url.href;

  return (
    <a ref={ref} href={href} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}

Link.displayName = 'Link';
