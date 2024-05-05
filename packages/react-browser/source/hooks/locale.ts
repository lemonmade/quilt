import {useBrowserEffect} from './browser-effect.ts';

export function useLocale(locale: string) {
  useBrowserEffect(
    (browser) => browser.htmlAttributes.add({lang: locale}),
    [locale],
  );
}
