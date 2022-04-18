export {
  createLocalizedFormatting,
  parseAcceptLanguageHeader,
} from '@quilted/localize';
export type {
  LocalizedFormatting,
  LocalizedFormattingCache,
  LocalizedNumberFormatOptions,
  LocalizedDateTimeFormatOptions,
} from '@quilted/localize';

export {Localization} from './Localization';
export {useLocalizedFormatting} from './hooks/formatting';
export {useLocale} from './hooks/locale';
export {useLocaleFromRequestHeaders} from './hooks/locale-from-request';
export {LocalizedFormattingContext} from './context';

// export function useLocale(): string {}
// export function useTranslate(): Translate {}
