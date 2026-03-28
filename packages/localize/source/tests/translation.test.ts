import {describe, it, expect} from 'vitest';

import {
  createTranslate,
  MissingTranslationError,
  MissingTranslationPlaceholderError,
} from '../translation.ts';

describe('translate()', () => {
  it('can translate a top-level key', () => {
    const translate = createTranslate('en', {
      hello: 'Hello',
    });

    expect(translate('hello')).toBe('Hello');
  });

  it('can translate a nested key', () => {
    const translate = createTranslate('en', {
      hello: {
        world: 'Hello world',
      },
    });

    expect(translate('hello.world')).toBe('Hello world');
  });

  it('can replace placeholders with a string', () => {
    const translate = createTranslate('en', {
      hello: 'Hello {name}',
    });

    expect(translate('hello', {name: 'world'})).toBe('Hello world');
  });

  it('can replace multiple placeholders', () => {
    const translate = createTranslate('en', {
      hello: 'Welcome to {location}, {name}!',
    });

    expect(translate('hello', {location: 'Ottawa', name: 'Winston'})).toBe(
      'Welcome to Ottawa, Winston!',
    );
  });

  it('can replace placeholders with a complex value', () => {
    const translate = createTranslate('en', {
      hello: 'Hello {name}',
    });

    const name = {
      toString() {
        return 'world';
      },
    };

    expect(translate('hello', {name})).toStrictEqual(['Hello ', name]);
  });

  it('uses a `count` placeholder to select a pluralization rule', () => {
    const translate = createTranslate('en', {
      message: {
        one: 'One message',
        other: '{count} messages',
      },
    });

    expect(translate('message', {count: 1})).toBe('One message');
    expect(translate('message', {count: 2})).toBe('2 messages');
  });

  it('falls back to `other` when the specific plural rule is missing', () => {
    const translate = createTranslate('en', {
      item: {
        other: '{count} items',
      },
    });

    expect(translate('item', {count: 1})).toBe('1 items');
  });

  it('throws MissingTranslationError for a missing key', () => {
    const translate = createTranslate('en', {});

    expect(() => translate('missing')).toThrow(MissingTranslationError);
  });

  it('throws MissingTranslationPlaceholderError for a missing placeholder', () => {
    const translate = createTranslate('en', {
      hello: 'Hello {name}',
    });

    expect(() => translate('hello')).toThrow(
      MissingTranslationPlaceholderError,
    );
  });

  describe('scope', () => {
    it('prepends scope to the key', () => {
      const translate = createTranslate('en', {
        pages: {
          home: {
            title: 'Welcome home',
          },
        },
      });

      expect(translate('title', {scope: 'pages.home'})).toBe('Welcome home');
    });

    it('works with pluralization', () => {
      const translate = createTranslate('en', {
        pages: {
          home: {
            message: {
              one: 'One message',
              other: '{count} messages',
            },
          },
        },
      });

      expect(translate('message', {scope: 'pages.home', count: 1})).toBe(
        'One message',
      );
      expect(translate('message', {scope: 'pages.home', count: 5})).toBe(
        '5 messages',
      );
    });

    it('works with placeholders', () => {
      const translate = createTranslate('en', {
        greetings: {
          hello: 'Hello {name}',
        },
      });

      expect(translate('hello', {scope: 'greetings', name: 'world'})).toBe(
        'Hello world',
      );
    });
  });

  describe('default', () => {
    it('returns the default value for a missing key', () => {
      const translate = createTranslate('en', {});

      expect(translate('missing', {default: 'Fallback'})).toBe('Fallback');
    });

    it('applies placeholder replacements to the default value', () => {
      const translate = createTranslate('en', {});

      expect(translate('missing', {default: 'Hello {name}', name: 'world'})).toBe(
        'Hello world',
      );
    });

    it('prefers an existing translation over the default', () => {
      const translate = createTranslate('en', {
        hello: 'Hello',
      });

      expect(translate('hello', {default: 'Fallback'})).toBe('Hello');
    });

    it('returns the default when pluralization key is also missing', () => {
      const translate = createTranslate('en', {});

      expect(translate('item', {count: 3, default: '{count} things'})).toBe(
        '3 things',
      );
    });
  });

  describe('ordinal', () => {
    it('uses ordinal plural rules when ordinal is true', () => {
      const translate = createTranslate('en', {
        place: {
          one: '{count}st',
          two: '{count}nd',
          few: '{count}rd',
          other: '{count}th',
        },
      });

      expect(translate('place', {count: 1, ordinal: true})).toBe('1st');
      expect(translate('place', {count: 2, ordinal: true})).toBe('2nd');
      expect(translate('place', {count: 3, ordinal: true})).toBe('3rd');
      expect(translate('place', {count: 4, ordinal: true})).toBe('4th');
      expect(translate('place', {count: 11, ordinal: true})).toBe('11th');
      expect(translate('place', {count: 21, ordinal: true})).toBe('21st');
    });

    it('falls back to other for ordinal rules', () => {
      const translate = createTranslate('en', {
        place: {
          other: '{count}th place',
        },
      });

      expect(translate('place', {count: 1, ordinal: true})).toBe('1th place');
    });
  });
});
