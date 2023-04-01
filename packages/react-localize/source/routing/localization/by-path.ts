import type {DefaultLocaleDefinition} from '../types.ts';
import {createRouteLocalization} from './by-locale.ts';

export function createRoutePathLocalization({
  locales,
  default: defaultLocaleDefinition,
}: {
  locales: string[];
  default: string | DefaultLocaleDefinition;
}) {
  const localeMap = new Map<string, string>();

  const defaultLocale =
    typeof defaultLocaleDefinition === 'string'
      ? defaultLocaleDefinition
      : defaultLocaleDefinition.locale;

  const defaultLocaleNested =
    typeof defaultLocaleDefinition === 'string' ||
    (defaultLocaleDefinition.nested ?? true);

  for (const locale of locales) {
    if (!defaultLocaleNested && locale === defaultLocale) {
      localeMap.set(locale, '/');
    } else {
      localeMap.set(locale, `/${locale.toLowerCase()}`);
    }
  }

  return createRouteLocalization({locales: localeMap, default: defaultLocale});
}
