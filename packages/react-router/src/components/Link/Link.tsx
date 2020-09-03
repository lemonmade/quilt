import React, {DetailedHTMLProps, AnchorHTMLAttributes} from 'react';
import {useRouter} from '../../hooks';
import type {NavigateTo} from '../../types';

interface Props
  extends Omit<
    DetailedHTMLProps<
      AnchorHTMLAttributes<HTMLAnchorElement>,
      HTMLAnchorElement
    >,
    'href'
  > {
  // should be resolved with the router
  to: NavigateTo;
  children?: React.ReactNode;
}

export function Link({children, to, onClick, ...rest}: Props) {
  const router = useRouter();

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);

    if (
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
    <a href={router.resolve(to).href} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}
