import React, {DetailedHTMLProps, AnchorHTMLAttributes} from 'react';
import {useRouter} from '../../hooks';

interface Props
  extends Omit<
    DetailedHTMLProps<
      AnchorHTMLAttributes<HTMLAnchorElement>,
      HTMLAnchorElement
    >,
    'href'
  > {
  // should be `to` instead of url, resolve it with the router
  url: string;
  children?: React.ReactNode;
}

export function Link({children, url, onClick, ...rest}: Props) {
  const router = useRouter();

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick != null) {
      onClick(event);
    }

    if (
      event.defaultPrevented ||
      event.shiftKey ||
      event.ctrlKey ||
      event.metaKey
    ) {
      return;
    }

    event.preventDefault();
    router.navigate(url);
  };

  return (
    <a href={url} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}
