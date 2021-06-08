import type {MouseEvent, DetailedHTMLProps, AnchorHTMLAttributes} from 'react';
import type {NavigateTo} from '@quilted/routing';

import {useRouter} from '../../hooks';

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

export function Link({
  children,
  to,
  onClick,
  external: explicitlyExternal = false,
  ...rest
}: Props) {
  const router = useRouter();
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

  return (
    <a href={url.href} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}
