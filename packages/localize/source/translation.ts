export interface Translate {
  <Placeholder = string>(
    key: string,
    placeholders?: {[key: string]: Placeholder | string | number},
  ): Placeholder extends string | number ? string : (string | Placeholder)[];
}

export type TranslationDictionary = {
  [key: string]: string | TranslationDictionary;
};

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

const EMPTY_PLACEHOLDERS = {};

const PLACEHOLDER_FINDER = /{{?([\w\s]+)}}?/g;

export function createTranslate(
  locale: string,
  dictionary: TranslationDictionary,
): Translate {
  let pluralRules: Intl.PluralRules | undefined;
  const translations = flattenTranslationDictionary(dictionary);

  return function translate<Placeholder = string>(
    key: string,
    placeholders: {
      [key: string]: Placeholder | string | number;
    } = EMPTY_PLACEHOLDERS,
  ) {
    let translation = translations.get(key);

    if (translation == null) {
      if (typeof placeholders.count === 'number') {
        pluralRules ??= new Intl.PluralRules(locale);
        const pluralRule = pluralRules.select(placeholders.count);

        translation =
          translations.get(`${key}.${pluralRule}`) ??
          translations.get(`${key}.other`);
      }
    }

    if (translation == null) {
      throw new MissingTranslationError(key);
    }

    let returnValue: string | (string | Placeholder)[] = '';

    let lastOffset = 0;
    let matchIndex = 0;

    PLACEHOLDER_FINDER.lastIndex = 0;

    translation.replace(PLACEHOLDER_FINDER, (match, placeholder, offset) => {
      const placeholderKey = placeholder.trim();
      const replacement = placeholders[placeholderKey];

      if (replacement == null) {
        throw new MissingTranslationPlaceholderError(key, placeholderKey);
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
  newContent: string | number | Replacement,
) {
  const addContent =
    typeof newContent === 'number' ? String(newContent) : newContent;

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
