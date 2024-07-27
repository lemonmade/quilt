import type {JSX, RenderableProps} from 'preact';
import {useMemo} from 'preact/hooks';
import type {NavigateTo} from '@quilted/routing';
import {computed} from '@quilted/signals';

import {useRouter} from '../hooks/router.ts';

interface Props extends Omit<JSX.HTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: NavigateTo;
  base?: string | URL;
  external?: boolean;
}

export function Link({
  ref,
  children,
  to,
  base,
  onClick,
  external: explicitlyExternal = false,
  ...rest
}: RenderableProps<Props, HTMLAnchorElement>) {
  const router = useRouter();

  if (router == null) {
    return (
      <a
        ref={ref}
        href={resolveToWithoutRouter(to)}
        onClick={onClick}
        {...rest}
      >
        {children}
      </a>
    );
  }

  const currentOrigin = useMemo(
    () => computed(() => router.currentRequest.url.origin),
    [router],
  ).value;
  const {url, external} = router.resolve(to, {base});

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

function resolveToWithoutRouter(to: NavigateTo): string {
  if (typeof to === 'function') {
    return resolveToWithoutRouter(to(new URL(window.location.href)));
  }
  if (typeof to === 'string') return to;
  if (to instanceof URL) return to.pathname + to.search + to.hash;
  return to.path + (to.search?.toString() || '') + (to.hash || '');
}
