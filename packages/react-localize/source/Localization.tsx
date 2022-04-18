import {useMemo} from 'react';
import {createLocalizedFormatting} from '@quilted/localize';
import {useHtmlAttributes} from '@quilted/react-html';
import type {PropsWithChildren} from '@quilted/useful-react-types';

import {LocaleContext, LocalizedFormattingContext} from './context';

export interface LocalizationProps {
  locale: string;
}

export function Localization({
  locale,
  children,
}: PropsWithChildren<LocalizationProps>) {
  useHtmlAttributes({lang: locale});

  const formatting = useMemo(() => createLocalizedFormatting(locale), [locale]);

  return (
    <LocaleContext.Provider value={locale}>
      <LocalizedFormattingContext.Provider value={formatting}>
        {children}
      </LocalizedFormattingContext.Provider>
    </LocaleContext.Provider>
  );
}
