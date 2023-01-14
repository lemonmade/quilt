import {useMemo} from 'react';
import {createLocalizedFormatting} from '@quilted/localize';
import {HtmlAttributes} from '@quilted/react-html';
import type {PropsWithChildren} from '@quilted/useful-react-types';

import {LocaleContext, LocalizedFormattingContext} from './context';

export interface LocalizationProps {
  locale: string;
}

export function Localization({
  locale,
  children,
}: PropsWithChildren<LocalizationProps>) {
  const formatting = useMemo(() => createLocalizedFormatting(locale), [locale]);

  return (
    <LocaleContext.Provider value={locale}>
      <LocalizedFormattingContext.Provider value={formatting}>
        <HtmlAttributes lang={locale} />
        {children}
      </LocalizedFormattingContext.Provider>
    </LocaleContext.Provider>
  );
}
