export {
  createTranslate,
  createLocalizedFormatting,
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

export {Localization} from './Localization.tsx';
export {useLocalizedFormatting} from './hooks/formatting.ts';
export {useLocale} from './hooks/locale.ts';
export {LocalizedFormattingContext} from './context.ts';

export * from './routing.ts';

// export function useLocale(): string {}
// export function useTranslate(): Translate {}
