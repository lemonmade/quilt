import type {LinkHTMLAttributes} from 'react';

export interface Props extends LinkHTMLAttributes<HTMLLinkElement> {
  href: string;
}

export function Style(props: Props) {
  return <link rel="stylesheet" type="text/css" {...props} />;
}
