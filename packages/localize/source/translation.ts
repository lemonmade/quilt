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

// A pre-parsed translation template. Each element is either a literal string
// or a placeholder reference (`{name}` → `TranslationPlaceholder`).
// A plain string (no placeholders) is stored as-is for O(1) return.
type TranslationTemplate = string | readonly TranslationSegment[];
type TranslationSegment = string | TranslationPlaceholder;

interface TranslationPlaceholder {
  readonly placeholder: string;
}

const EMPTY_OPTIONS: TranslateOptions = {};

const PLACEHOLDER_FINDER = /{{?([\w\s]+)}}?/g;

const RESERVED_OPTION_KEYS = new Set(['scope', 'default', 'ordinal']);

const DEFAULT_CACHE_SIZE = 500;

export function createTranslate(
  locale: string,
  dictionary: TranslationDictionary,
  {cacheSize = DEFAULT_CACHE_SIZE}: {cacheSize?: number} = {},
): Translate {
  let pluralRules: Intl.PluralRules | undefined;
  let ordinalRules: Intl.PluralRules | undefined;
  const templates = flattenTranslationDictionary(dictionary);
  const cache = new LRUCache<string, string>(cacheSize);

  return function translate<Placeholder = string>(
    key: string,
    options: TranslateOptions<Placeholder> = EMPTY_OPTIONS as any,
  ) {
    const {scope, default: defaultValue, ordinal, count} = options;

    const resolvedKey = scope ? `${scope}.${key}` : key;

    let template = templates.get(resolvedKey);

    if (template === undefined) {
      if (typeof count === 'number') {
        if (ordinal) {
          ordinalRules ??= new Intl.PluralRules(locale, {type: 'ordinal'});
          const rule = ordinalRules.select(count);
          template =
            templates.get(`${resolvedKey}.${rule}`) ??
            templates.get(`${resolvedKey}.other`);
        } else {
          pluralRules ??= new Intl.PluralRules(locale);
          const rule = pluralRules.select(count);
          template =
            templates.get(`${resolvedKey}.${rule}`) ??
            templates.get(`${resolvedKey}.other`);
        }
      }
    }

    if (template === undefined) {
      if (defaultValue != null) {
        // Default values are provided at call time, so we parse them on demand.
        template = parseTranslationString(defaultValue);
      } else {
        throw new MissingTranslationError(resolvedKey);
      }
    }

    // Plain string with no placeholders — O(1) return, no cache needed.
    if (typeof template === 'string') {
      return template as any;
    }

    // Check whether all replacements are cacheable (string | number | boolean).
    // When a non-primitive replacement is provided we must build a fresh array
    // every time since the result contains object references.
    const cacheable = isCacheable(options);

    if (cacheable) {
      const cacheKey = buildCacheKey(resolvedKey, options);
      const cached = cache.get(cacheKey);
      if (cached !== undefined) return cached as any;

      const result = evaluateTemplate(template, resolvedKey, options);
      // `cacheable` guarantees all replacements were primitives, so `result`
      // is always a string here.
      cache.set(cacheKey, result as string);
      return result as any;
    }

    return evaluateTemplate(template, resolvedKey, options) as any;
  };
}

function evaluateTemplate<Placeholder>(
  template: readonly TranslationSegment[],
  resolvedKey: string,
  options: TranslateOptions<Placeholder>,
): string | (string | Placeholder)[] {
  let returnValue: string | (string | Placeholder)[] = '';

  for (const segment of template) {
    if (typeof segment === 'string') {
      returnValue = appendToTranslateReturnValue(returnValue, segment);
    } else {
      if (RESERVED_OPTION_KEYS.has(segment.placeholder)) {
        throw new MissingTranslationPlaceholderError(
          resolvedKey,
          segment.placeholder,
        );
      }

      const replacement = options[segment.placeholder];

      if (replacement == null) {
        throw new MissingTranslationPlaceholderError(
          resolvedKey,
          segment.placeholder,
        );
      }

      returnValue = appendToTranslateReturnValue(returnValue, replacement);
    }
  }

  return returnValue;
}

function isCacheable(options: TranslateOptions<unknown>): boolean {
  for (const key in options) {
    if (RESERVED_OPTION_KEYS.has(key)) continue;
    const value = options[key];
    if (
      typeof value !== 'string' &&
      typeof value !== 'number' &&
      typeof value !== 'boolean' &&
      value !== undefined
    ) {
      return false;
    }
  }
  return true;
}

function buildCacheKey(
  resolvedKey: string,
  options: TranslateOptions<unknown>,
): string {
  // For the common case of no options at all, the resolved key is enough.
  if (options === EMPTY_OPTIONS) return resolvedKey;

  let cacheKey = resolvedKey;

  for (const key in options) {
    const value = options[key];
    if (value !== undefined) {
      cacheKey += `\0${key}\0${value}`;
    }
  }

  return cacheKey;
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

// Parses a translation string into a template. Strings without placeholders
// are returned as-is (a plain `string`), avoiding any per-call work.
function parseTranslationString(source: string): TranslationTemplate {
  const segments: TranslationSegment[] = [];
  let lastOffset = 0;

  PLACEHOLDER_FINDER.lastIndex = 0;

  let match: RegExpExecArray | null;

  while ((match = PLACEHOLDER_FINDER.exec(source)) !== null) {
    const literal = source.substring(lastOffset, match.index);
    if (literal) segments.push(literal);
    segments.push({placeholder: match[1]!.trim()});
    lastOffset = match.index + match[0].length;
  }

  // No placeholders found — return the string directly.
  if (segments.length === 0) return source;

  const trailing = source.substring(lastOffset);
  if (trailing) segments.push(trailing);

  return segments;
}

function flattenTranslationDictionary(dictionary: TranslationDictionary) {
  const templates = new Map<string, TranslationTemplate>();

  const handleKey = (key: string, value: string | TranslationDictionary) => {
    if (typeof value === 'string') {
      templates.set(key, parseTranslationString(value));
    } else {
      for (const nestedKey of Object.keys(value)) {
        handleKey(`${key}.${nestedKey}`, value[nestedKey]!);
      }
    }
  };

  for (const key of Object.keys(dictionary)) {
    handleKey(key, dictionary[key]!);
  }

  return templates;
}

class LRUCache<K, V> {
  readonly #maxSize: number;
  readonly #map = new Map<K, V>();

  constructor(maxSize: number) {
    this.#maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.#map.get(key);
    if (value === undefined) return undefined;

    // Move to end (most recently used).
    this.#map.delete(key);
    this.#map.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    // If key already exists, delete first so it moves to the end.
    if (this.#map.has(key)) {
      this.#map.delete(key);
    } else if (this.#map.size >= this.#maxSize) {
      // Evict the least recently used (first entry).
      const firstKey = this.#map.keys().next().value!;
      this.#map.delete(firstKey);
    }

    this.#map.set(key, value);
  }

  get size() {
    return this.#map.size;
  }
}
