import type {ComponentProps} from 'preact';
import {useMemo} from 'preact/hooks';
import {useCurrentURL, Link, useRouter} from '@quilted/preact-router';

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
  const url = useCurrentURL();
  const {redirectURL} = useRouteLocalization();

  const resolvedURL = useMemo(
    () => redirectURL(to ? router.resolve(to).url : url, {to: locale}),
    [to, url, locale, redirectURL, router],
  );

  return <Link hrefLang={locale} to={resolvedURL} {...props} />;
}
