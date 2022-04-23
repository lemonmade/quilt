import type {DefaultLocaleDefinition} from '../types';
import {createRouteLocalization} from './by-locale';

export function createRouteSubdomainLocalization({
  base,
  locales,
  default: defaultLocaleDefinition,
}: {
  base: string;
  locales: string[];
  default: string | DefaultLocaleDefinition;
}) {
  const localeMap = new Map<string, string>();
  const normalizedBase = base.replace(/^https?:\/\//, '');

  const defaultLocale =
    typeof defaultLocaleDefinition === 'string'
      ? defaultLocaleDefinition
      : defaultLocaleDefinition.locale;

  const defaultLocaleNested =
    typeof defaultLocaleDefinition === 'string' ||
    (defaultLocaleDefinition.nested ?? true);

  for (const locale of locales) {
    if (!defaultLocaleNested && locale === defaultLocale) {
      localeMap.set(locale, normalizedBase);
    } else {
      localeMap.set(locale, `${locale.toLowerCase()}.${normalizedBase}`);
    }
  }

  return createRouteLocalization({locales: localeMap, default: defaultLocale});
}
