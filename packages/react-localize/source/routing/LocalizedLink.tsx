import {useMemo} from 'react';
import type {ComponentProps} from 'react';
import {useCurrentUrl, Link, useRouter} from '@quilted/react-router';

import {useRouteLocalization} from './context';

type LinkProps = ComponentProps<typeof Link>;

export function LocalizedLink({
  to,
  locale,
  ...props
}: Omit<LinkProps, 'to' | 'hrefLang'> & {
  locale: string;
  to?: LinkProps['to'];
}) {
  const router = useRouter();
  const currentUrl = useCurrentUrl();
  const {redirectUrl} = useRouteLocalization();

  const resolvedUrl = useMemo(
    () => redirectUrl(to ? router.resolve(to).url : currentUrl, {to: locale}),
    [to, currentUrl, locale, redirectUrl, router],
  );

  return <Link hrefLang={locale} to={resolvedUrl} {...props} />;
}
