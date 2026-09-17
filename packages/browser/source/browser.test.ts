// @vitest-environment jsdom

import {describe, it, expect, beforeEach} from 'vitest';

import {BrowserHeadElements} from './browser.ts';

describe('BrowserHeadElements', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
  });

  it('adopts a matching server-rendered element instead of appending a duplicate', () => {
    const initial = addMeta({name: 'theme-color', content: 'black'});
    const meta = new BrowserHeadElements('meta');

    meta.add({name: 'theme-color', content: 'black'});

    expect(themeColors()).toStrictEqual([initial]);
  });

  it('re-inserts a value matching the server-rendered element after it was torn down', () => {
    addMeta({name: 'theme-color', content: 'black'});
    const meta = new BrowserHeadElements('meta');

    const removeDark = meta.add({name: 'theme-color', content: 'black'});
    removeDark();
    const removeLight = meta.add({name: 'theme-color', content: 'white'});
    removeLight();
    meta.add({name: 'theme-color', content: 'black'});

    expect(themeColors().map((element) => element.content)).toStrictEqual([
      'black',
    ]);
  });

  it('does not let one teardown remove an element another caller still holds', () => {
    addMeta({name: 'theme-color', content: 'black'});
    const meta = new BrowserHeadElements('meta');

    const removeFirst = meta.add({name: 'theme-color', content: 'black'});
    meta.add({name: 'theme-color', content: 'black'});
    removeFirst();

    expect(themeColors().map((element) => element.content)).toStrictEqual([
      'black',
    ]);
  });
});

function addMeta(attributes: {name: string; content: string}) {
  const element = document.createElement('meta');
  element.name = attributes.name;
  element.content = attributes.content;
  document.head.append(element);
  return element;
}

function themeColors() {
  return Array.from(
    document.head.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'),
  );
}
