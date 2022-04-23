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
export {useLocaleFromEnvironment} from './hooks/locale-from-environment';
export {LocalizedFormattingContext} from './context';

export * from './routing';

// export function useLocale(): string {}
// export function useTranslate(): Translate {}
