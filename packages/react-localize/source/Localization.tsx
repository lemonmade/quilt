import {useMemo} from 'react';
import {createLocalizedFormatting} from '@quilted/localize';
import {HTMLAttributes} from '@quilted/react-html';
import type {PropsWithChildren} from '@quilted/useful-react-types';

import {LocaleContext, LocalizedFormattingContext} from './context.ts';

export interface LocalizationProps {
  locale: string;
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
  locale,
  direction = RTL_LOCALES.has(locale) ? 'rtl' : 'ltr',
  children,
}: PropsWithChildren<LocalizationProps>) {
  const formatting = useMemo(() => createLocalizedFormatting(locale), [locale]);

  return (
    <LocaleContext.Provider value={locale}>
      <LocalizedFormattingContext.Provider value={formatting}>
        <HTMLAttributes lang={locale} dir={direction} />
        {children}
      </LocalizedFormattingContext.Provider>
    </LocaleContext.Provider>
  );
}
