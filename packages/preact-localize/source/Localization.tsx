import type {RenderableProps} from 'preact';
import {useMemo} from 'preact/hooks';
import {createLocalizedFormatting} from '@quilted/localize';
import {HTMLAttributes, useBrowserDetails} from '@quilted/preact-browser';

import {LocaleContext, LocalizedFormattingContext} from './context.ts';

export interface LocalizationProps {
  locale?: string;
  direction?: 'ltr' | 'rtl';
}

const RTL_LOCALES = new Set([
  'ar',
  'arc',
  'ckb',
  'dv',
  'fa',
  'ha',
  'he',
  'khw',
  'ks',
  'ps',
  'sd',
  'ur',
  'uz-AF',
  'yi',
]);

export function Localization({
  locale: explicitLocale,
  direction: explicitDirection,
  children,
}: RenderableProps<LocalizationProps>) {
  const browserDetails = useBrowserDetails({optional: true});
  const locale =
    explicitLocale ??
    browserDetails?.locale.value ??
    getLocaleFromEnvironment();

  const formatting = useMemo(() => createLocalizedFormatting(locale), [locale]);
  const direction =
    explicitDirection ?? (RTL_LOCALES.has(locale) ? 'rtl' : 'ltr');

  return (
    <LocaleContext.Provider value={locale}>
      <LocalizedFormattingContext.Provider value={formatting}>
        <HTMLAttributes lang={locale} dir={direction} />
        {children}
      </LocalizedFormattingContext.Provider>
    </LocaleContext.Provider>
  );
}

function getLocaleFromEnvironment() {
  if (typeof navigator === 'undefined') {
    throw new Error(`Could not determine the locale automatically`);
  }

  return navigator.language;
}
