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
  /**
   * Whether the router applies its default scroll behavior when this link
   * navigates (scroll to the top, or to the URL's hash target). Pass `false`
   * to keep the current scroll position, or `true` to force the reset; when
   * omitted, navigations that only change the search params keep the current
   * position. Forwarded to `navigation.navigate()`'s `scroll` option.
   */
  scroll?: boolean;
}

export function Link({
  ref,
  children,
  to,
  target,
  base,
  onClick,
  scroll,
  external: explicitlyExternal = target != null,
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

    if (scroll == null) {
      navigation.navigate(to);
    } else {
      navigation.navigate(to, {scroll});
    }
  };

  const href =
    url.origin === currentOrigin ? url.href.slice(url.origin.length) : url.href;

  return (
    <a ref={ref} href={href} target={target} onClick={handleClick} {...rest}>
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
