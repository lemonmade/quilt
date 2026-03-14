import {useQuiltContext} from '@quilted/preact-context';

export function useLocale() {
  return useQuiltContext('localization').locale;
}
