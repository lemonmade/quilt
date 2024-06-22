// import type {ComponentProps, RenderableProps} from 'preact';
// import {useMemo} from 'preact/hooks';
// import {Navigation} from '@quilted/preact-router';

// import {Localization} from '../Localization.tsx';
// import {useLocaleFromEnvironment} from '../hooks/locale-from-environment.ts';

// import type {RouteLocalization, ResolvedRouteLocalization} from './types.ts';
// import {RouteLocalizationContext} from './context.ts';

// export type LocalizedRoutingProps = Omit<
//   ComponentProps<typeof Navigation>,
//   'prefix' | 'initialUrl'
// > & {
//   locale?: string;
//   localization: RouteLocalization;
// };

// export function LocalizedRouting({
//   locale: explicitLocale,
//   localization,
//   children,
//   // isExternal: isExplicitlyExternal,
//   ...props
// }: RenderableProps<LocalizedRoutingProps>) {
//   const initialUrl = useInitialURL();
//   const localeFromEnvironment = useLocaleFromEnvironment();

//   const {
//     prefix,
//     // isExternal: isExternalByRouteLocale,
//     resolvedLocalization,
//   } = useMemo(() => {
//     const {localeFromUrl} = localization;

//     const matchedLocale = initialUrl && localeFromUrl(initialUrl);

//     const resolvedLocalization: ResolvedRouteLocalization = {
//       locale: matchedLocale ?? localization.defaultLocale,
//       ...localization,
//     };

//     const rootUrl = localization.redirectUrl(
//       new URL('/', initialUrl ?? 'https://example.com'),
//       {to: resolvedLocalization.locale},
//     );

//     return {
//       prefix: rootUrl.pathname.length > 1 ? rootUrl.pathname : undefined,
//       isExternal: (url: URL) => matchedLocale !== localeFromUrl(url),
//       resolvedLocalization,
//     };
//   }, [initialUrl, localization]);

//   // const isExternal = useCallback(
//   //   (url: URL, currentUrl: URL) => {
//   //     return (
//   //       isExternalByRouteLocale(url) ||
//   //       (isExplicitlyExternal?.(url, currentUrl) ?? false)
//   //     );
//   //   },
//   //   [isExplicitlyExternal, isExternalByRouteLocale],
//   // );

//   let resolvedLocale: string;

//   if (explicitLocale) {
//     resolvedLocale = explicitLocale;
//   } else if (
//     localeFromEnvironment != null &&
//     localeFromEnvironment
//       .toLowerCase()
//       .startsWith(resolvedLocalization.locale.toLowerCase())
//   ) {
//     resolvedLocale = localeFromEnvironment;
//   } else {
//     resolvedLocale = resolvedLocalization.locale;
//   }

//   return (
//     <Navigation
//       {...props}
//       // prefix={prefix}
//       url={initialUrl}
//       // isExternal={isExternal}
//     >
//       <Localization locale={resolvedLocale}>
//         <RouteLocalizationContext.Provider value={resolvedLocalization}>
//           {children}
//         </RouteLocalizationContext.Provider>
//       </Localization>
//     </Navigation>
//   );
// }
