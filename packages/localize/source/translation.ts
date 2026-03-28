export interface TranslateOptions<Placeholder = string> {
  [key: string]: Placeholder | string | number | boolean | undefined;
  scope?: string;
  default?: string;
  ordinal?: boolean;
  count?: number;
}

export interface Translate {
  <Placeholder = string>(
    key: string,
    options?: TranslateOptions<Placeholder>,
  ): Placeholder extends string | number | boolean | undefined
    ? string
    : (string | Placeholder)[];
}

export type TranslationDictionary = {
  [key: string]: string | TranslationDictionary;
};

export class MissingTranslationsError extends Error {
  constructor() {
    super(
      'No translations provided. Pass a `translations` option to the Localization constructor.',
    );
  }
}

export class MissingTranslationError extends Error {
  constructor(public readonly key: string) {
    super(`Missing translation for key "${key}"`);
  }
}

export class MissingTranslationPlaceholderError extends Error {
  constructor(
    public readonly key: string,
    public readonly placeholder: string,
  ) {
    super(`Missing translation placeholder "${placeholder}" for key "${key}"`);
  }
}

const EMPTY_OPTIONS: TranslateOptions = {};

const PLACEHOLDER_FINDER = /{{?([\w\s]+)}}?/g;

const RESERVED_OPTION_KEYS = new Set(['scope', 'default', 'ordinal']);

export function createTranslate(
  locale: string,
  dictionary: TranslationDictionary,
): Translate {
  let pluralRules: Intl.PluralRules | undefined;
  let ordinalRules: Intl.PluralRules | undefined;
  const translations = flattenTranslationDictionary(dictionary);

  return function translate<Placeholder = string>(
    key: string,
    options: TranslateOptions<Placeholder> = EMPTY_OPTIONS as any,
  ) {
    const {scope, default: defaultValue, ordinal, count} = options;

    const resolvedKey = scope ? `${scope}.${key}` : key;

    let translation = translations.get(resolvedKey);

    if (translation == null) {
      if (typeof count === 'number') {
        if (ordinal) {
          ordinalRules ??= new Intl.PluralRules(locale, {type: 'ordinal'});
          const rule = ordinalRules.select(count);
          translation =
            translations.get(`${resolvedKey}.${rule}`) ??
            translations.get(`${resolvedKey}.other`);
        } else {
          pluralRules ??= new Intl.PluralRules(locale);
          const rule = pluralRules.select(count);
          translation =
            translations.get(`${resolvedKey}.${rule}`) ??
            translations.get(`${resolvedKey}.other`);
        }
      }
    }

    if (translation == null) {
      if (defaultValue != null) {
        translation = defaultValue;
      } else {
        throw new MissingTranslationError(resolvedKey);
      }
    }

    let returnValue: string | (string | Placeholder)[] = '';

    let lastOffset = 0;
    let matchIndex = 0;

    PLACEHOLDER_FINDER.lastIndex = 0;

    translation.replace(PLACEHOLDER_FINDER, (match, placeholder, offset) => {
      const placeholderKey = placeholder.trim();

      if (RESERVED_OPTION_KEYS.has(placeholderKey)) {
        throw new MissingTranslationPlaceholderError(
          resolvedKey,
          placeholderKey,
        );
      }

      const replacement = options[placeholderKey];

      if (replacement == null) {
        throw new MissingTranslationPlaceholderError(
          resolvedKey,
          placeholderKey,
        );
      }

      matchIndex += 1;

      const stringBeforeFirstPlaceholder = translation!.substring(
        lastOffset,
        offset,
      );

      if (stringBeforeFirstPlaceholder) {
        returnValue = appendToTranslateReturnValue(
          returnValue,
          stringBeforeFirstPlaceholder,
        );
      }

      returnValue = appendToTranslateReturnValue(returnValue, replacement);
      lastOffset = offset + match.length;

      return '';
    });

    const stringAfterLastPlaceholder = translation.substring(lastOffset);

    if (stringAfterLastPlaceholder) {
      returnValue = appendToTranslateReturnValue(
        returnValue,
        stringAfterLastPlaceholder,
      );
    }

    return returnValue as any;
  };
}

function appendToTranslateReturnValue<Replacement>(
  current: string | (string | Replacement)[],
  newContent: string | number | boolean | Replacement,
) {
  const addContent =
    typeof newContent === 'number' || typeof newContent === 'boolean'
      ? String(newContent)
      : newContent;

  if (Array.isArray(current)) {
    current.push(addContent);
    return current;
  }

  if (typeof addContent === 'string') {
    return current + addContent;
  }

  return [current, addContent];
}

function flattenTranslationDictionary(dictionary: TranslationDictionary) {
  const translations = new Map<string, string>();

  const handleKey = (key: string, value: string | TranslationDictionary) => {
    if (typeof value === 'string') {
      translations.set(key, value);
    } else {
      for (const nestedKey of Object.keys(value)) {
        handleKey(`${key}.${nestedKey}`, value[nestedKey]!);
      }
    }
  };

  for (const key of Object.keys(dictionary)) {
    handleKey(key, dictionary[key]!);
  }

  return translations;
}
