import {useContext} from 'react';
import {LocaleContext} from '../context.ts';

export function useLocale() {
  const locale = useContext(LocaleContext);

  if (locale === undefined) {
    throw new Error('useLocale() must be used within a Localization component');
  }

  return locale;
}
