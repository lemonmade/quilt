import {forwardRef} from 'react';
import type {MouseEvent, DetailedHTMLProps, AnchorHTMLAttributes} from 'react';
import type {NavigateTo} from '@quilted/routing';

import {useRouter, useCurrentUrl} from '../../hooks';

interface Props
  extends Omit<
    DetailedHTMLProps<
      AnchorHTMLAttributes<HTMLAnchorElement>,
      HTMLAnchorElement
    >,
    'href'
  > {
  to: NavigateTo;
  external?: boolean;
}

export const Link = forwardRef<HTMLAnchorElement, Props>(function Link(
  {children, to, onClick, external: explicitlyExternal = false, ...rest},
  ref,
) {
  const router = useRouter();
  const currentUrl = useCurrentUrl();
  const {url, external} = router.resolve(to);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
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
    url.origin === currentUrl.origin
      ? url.href.slice(url.origin.length)
      : url.href;

  return (
    <a ref={ref} href={href} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
});

Link.displayName = 'Link';
