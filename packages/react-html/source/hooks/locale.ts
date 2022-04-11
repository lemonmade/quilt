import {useDomEffect} from './dom-effect';

export function useLocale(locale: string) {
  useDomEffect(
    (manager) => manager.addHtmlAttributes({lang: locale}),
    [locale],
  );
}
