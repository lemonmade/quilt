import type {ComponentProps} from 'preact';
import {useMemo} from 'preact/hooks';
import {useCurrentUrl, Link, useRouter} from '@quilted/preact-router';

import {useRouteLocalization} from './context.ts';

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
