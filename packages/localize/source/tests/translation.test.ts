import {describe, it} from '@quilted/testing';

import {createTranslate} from '../translation.ts';

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
});
