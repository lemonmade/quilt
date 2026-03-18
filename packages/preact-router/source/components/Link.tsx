import type {
  RenderableProps,
  AnchorHTMLAttributes,
  MouseEventHandler,
} from 'preact';
import {useMemo} from 'preact/hooks';
import type {NavigateTo} from '@quilted/routing';
import {computed} from '@quilted/signals';

import {useNavigation} from '../hooks/navigation.ts';

interface Props extends Omit<AnchorHTMLAttributes, 'href'> {
  to: NavigateTo;
  base?: string | URL;
  external?: boolean;
}

export function Link({
  ref,
  children,
  to,
  target,
  base,
  onClick,
  external: explicitlyExternal = target === '_blank',
  ...rest
}: RenderableProps<Props, HTMLAnchorElement>) {
  const navigation = useNavigation();

  if (navigation == null) {
    return (
      <a
        ref={ref}
        href={resolveToWithoutRouter(to)}
        target={target}
        onClick={onClick}
        {...rest}
      >
        {children}
      </a>
    );
  }

  const currentOrigin = useMemo(
    () => computed(() => navigation.currentRequest.url.origin),
    [navigation],
  ).value;
  const {url, external} = navigation.resolve(to, {base});

  const handleClick: MouseEventHandler<HTMLAnchorElement> = (event) => {
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
    navigation.navigate(to);
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
