export {
  createTranslate,
  Localization,
  parseAcceptLanguageHeader,
  MissingTranslationError,
  MissingTranslationPlaceholderError,
} from '@quilted/localize';
export type {
  Translate,
  TranslationDictionary,
  LocalizedFormatting,
  LocalizedFormattingCache,
  LocalizedNumberFormatOptions,
  LocalizedDateTimeFormatOptions,
} from '@quilted/localize';

export {useLocalizedFormatting} from './hooks/formatting.ts';
export {useLocale} from './hooks/locale.ts';
export {useAlternateURL} from './hooks/alternate-url.ts';
export {AlternateURL} from './components/AlternateURL.tsx';

export * from './routing.ts';
