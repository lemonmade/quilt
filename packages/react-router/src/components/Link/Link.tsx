import type {DetailedHTMLProps, AnchorHTMLAttributes} from 'react';
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

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
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
