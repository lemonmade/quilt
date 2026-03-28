import {describe, it, expect} from 'vitest';

import {Localization} from '../localization.ts';
import {
  MissingTranslationsError,
  MissingTranslationError,
} from '../translation.ts';

describe('Localization', () => {
  describe('translate()', () => {
    it('translates a top-level key', () => {
      const localization = new Localization('en', {
        translations: {hello: 'Hello'},
      });

      expect(localization.translate('hello')).toBe('Hello');
    });

    it('translates a nested key', () => {
      const localization = new Localization('en', {
        translations: {
          hello: {world: 'Hello world'},
        },
      });

      expect(localization.translate('hello.world')).toBe('Hello world');
    });

    it('replaces placeholders with strings', () => {
      const localization = new Localization('en', {
        translations: {hello: 'Hello {name}'},
      });

      expect(localization.translate('hello', {name: 'world'})).toBe(
        'Hello world',
      );
    });

    it('returns an array when a non-string replacement is provided', () => {
      const localization = new Localization('en', {
        translations: {hello: 'Hello {name}'},
      });

      const name = {value: 'world'};

      expect(localization.translate('hello', {name})).toStrictEqual([
        'Hello ',
        name,
      ]);
    });

    it('pluralizes using count', () => {
      const localization = new Localization('en', {
        translations: {
          message: {
            one: 'One message',
            other: '{count} messages',
          },
        },
      });

      expect(localization.translate('message', {count: 1})).toBe(
        'One message',
      );
      expect(localization.translate('message', {count: 5})).toBe(
        '5 messages',
      );
    });

    it('supports scope option', () => {
      const localization = new Localization('en', {
        translations: {
          pages: {home: {title: 'Welcome'}},
        },
      });

      expect(localization.translate('title', {scope: 'pages.home'})).toBe(
        'Welcome',
      );
    });

    it('supports default option', () => {
      const localization = new Localization('en', {
        translations: {},
      });

      expect(localization.translate('missing', {default: 'Fallback'})).toBe(
        'Fallback',
      );
    });

    it('supports ordinal pluralization', () => {
      const localization = new Localization('en', {
        translations: {
          place: {
            one: '{count}st',
            two: '{count}nd',
            few: '{count}rd',
            other: '{count}th',
          },
        },
      });

      expect(localization.translate('place', {count: 1, ordinal: true})).toBe(
        '1st',
      );
      expect(localization.translate('place', {count: 2, ordinal: true})).toBe(
        '2nd',
      );
    });

    it('throws MissingTranslationsError when no translations were provided', () => {
      const localization = new Localization('en');

      expect(() => localization.translate('hello')).toThrow(
        MissingTranslationsError,
      );
    });

    it('throws MissingTranslationError for a missing key', () => {
      const localization = new Localization('en', {
        translations: {},
      });

      expect(() => localization.translate('missing')).toThrow(
        MissingTranslationError,
      );
    });
  });
});
