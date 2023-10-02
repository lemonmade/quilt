import {useDomEffect} from './dom-effect.ts';

export function useLocale(locale: string) {
  useDomEffect((manager) => manager.addAttributes({lang: locale}), [locale]);
}
