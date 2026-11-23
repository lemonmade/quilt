// @vitest-environment jsdom

import {describe, it, expect, beforeEach} from 'vitest';
import {signal} from '@quilted/signals';

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
  describe('server-rendered elements nothing adopts', () => {
    it('removes them once the first client render has had a chance to adopt them', async () => {
      const serverIcon = addLink({rel: 'icon', href: '/server.png'});
      const links = new BrowserHeadElements('link');

      links.add({rel: 'icon', href: '/client.png'});

      // Still present synchronously: other `add()` calls from the same render
      // could adopt it.
      expect(serverIcon.isConnected).toBe(true);

      await settle();

      expect(icons().map((link) => link.getAttribute('href'))).toStrictEqual([
        '/client.png',
      ]);
      expect(serverIcon.isConnected).toBe(false);
    });

    it('keeps adopted elements and removes only the unadopted ones of the same kind', async () => {
      const small = addLink({rel: 'icon', href: '/16.png', sizes: '16x16'});
      addLink({rel: 'icon', href: '/32.png', sizes: '32x32'});
      const links = new BrowserHeadElements('link');

      links.add({rel: 'icon', href: '/16.png', sizes: '16x16'});
      await settle();

      expect(icons()).toStrictEqual([small]);
    });

    it('treats the legacy `shortcut icon` rel as the same kind as `icon`', async () => {
      addLink({rel: 'shortcut icon', href: '/server.ico'});
      const links = new BrowserHeadElements('link');

      links.add({rel: 'icon', href: '/client.png'});
      await settle();

      expect(icons().map((link) => link.getAttribute('href'))).toStrictEqual([
        '/client.png',
      ]);
    });

    it('does not remove elements of a kind the client never adds', async () => {
      addLink({rel: 'stylesheet', href: '/app.css'});
      addLink({rel: 'manifest', href: '/app.webmanifest'});
      const viewport = addMeta({
        name: 'viewport',
        content: 'width=device-width',
      });
      const links = new BrowserHeadElements('link');
      const metas = new BrowserHeadElements('meta');

      links.add({rel: 'icon', href: '/client.png'});
      metas.add({name: 'theme-color', content: 'black'});
      await settle();

      expect(
        Array.from(document.head.querySelectorAll('link')).map((link) =>
          link.getAttribute('rel'),
        ),
      ).toStrictEqual(['stylesheet', 'manifest', 'icon']);
      expect(viewport.isConnected).toBe(true);
    });

    it('never removes resource links, even when the client adds one', async () => {
      addLink({rel: 'stylesheet', href: '/app.css'});
      const links = new BrowserHeadElements('link');

      links.add({rel: 'stylesheet', href: '/other.css'});
      await settle();

      expect(document.head.querySelectorAll('link')).toHaveLength(2);
    });

    it('removes them when the client first adds that kind after the initial render', async () => {
      addLink({rel: 'icon', href: '/server.png'});
      const links = new BrowserHeadElements('link');

      links.add({rel: 'canonical', href: '/'});
      await settle();
      expect(icons()).toHaveLength(1);

      links.add({rel: 'icon', href: '/client.png'});

      expect(icons().map((link) => link.getAttribute('href'))).toStrictEqual([
        '/client.png',
      ]);
    });

    it('removes stale theme-color metas', async () => {
      addMeta({name: 'theme-color', content: 'white'});
      const metas = new BrowserHeadElements('meta');

      metas.add({name: 'theme-color', content: 'black'});
      await settle();

      expect(themeColors().map((element) => element.content)).toStrictEqual([
        'black',
      ]);
    });
  });

  describe('signal-driven attributes', () => {
    it('updates an attribute when the signal changes', () => {
      const links = new BrowserHeadElements('link');
      const attributes = signal<Record<string, string>>({
        rel: 'canonical',
        href: 'https://example.com/one',
      });

      links.add(attributes);
      const link = document.head.querySelector('link')!;

      attributes.value = {rel: 'canonical', href: 'https://example.com/two'};

      expect(document.head.querySelector('link')).toBe(link);
      expect(link.getAttribute('href')).toBe('https://example.com/two');
    });

    it('removes an attribute that is no longer present', () => {
      const links = new BrowserHeadElements('link');
      const attributes = signal<Record<string, string>>({
        rel: 'alternate',
        href: '/feed.xml',
        type: 'application/rss+xml',
        hreflang: 'en',
      });

      links.add(attributes);
      const link = document.head.querySelector('link')!;

      attributes.value = {rel: 'alternate', href: '/feed.atom'};

      expect(link.getAttribute('href')).toBe('/feed.atom');
      expect(link.hasAttribute('type')).toBe(false);
      expect(link.hasAttribute('hreflang')).toBe(false);
    });

    it('replaces icon links instead of mutating them', () => {
      const links = new BrowserHeadElements('link');
      const attributes = signal<Record<string, string>>({
        rel: 'icon',
        href: '/one.png',
        sizes: '32x32',
      });

      const remove = links.add(attributes);
      const original = icons()[0]!;

      attributes.value = {rel: 'icon', href: '/two.png'};

      const [replacement] = icons();
      expect(icons()).toHaveLength(1);
      expect(replacement).not.toBe(original);
      expect(original.isConnected).toBe(false);
      expect(replacement!.getAttribute('href')).toBe('/two.png');
      expect(replacement!.hasAttribute('sizes')).toBe(false);

      remove();
      expect(icons()).toHaveLength(0);
    });

    it('replaces apple-touch-icon links and theme-color metas instead of mutating them', () => {
      const links = new BrowserHeadElements('link');
      const metas = new BrowserHeadElements('meta');
      const touchIcon = signal({rel: 'apple-touch-icon', href: '/one.png'});
      const themeColor = signal({name: 'theme-color', content: 'white'});

      links.add(touchIcon);
      metas.add(themeColor);
      const originalLink = document.head.querySelector('link')!;
      const originalMeta = document.head.querySelector('meta')!;

      touchIcon.value = {rel: 'apple-touch-icon', href: '/two.png'};
      themeColor.value = {name: 'theme-color', content: 'black'};

      const link = document.head.querySelector('link')!;
      const meta = document.head.querySelector('meta')!;
      expect(link).not.toBe(originalLink);
      expect(link.getAttribute('href')).toBe('/two.png');
      expect(meta).not.toBe(originalMeta);
      expect(meta.content).toBe('black');
    });

    it('does not touch an adopted server-rendered icon until its attributes change', () => {
      const serverIcon = addLink({rel: 'icon', href: '/one.png'});
      const links = new BrowserHeadElements('link');
      const attributes = signal({rel: 'icon', href: '/one.png'});

      links.add(attributes);
      expect(icons()).toStrictEqual([serverIcon]);

      attributes.value = {rel: 'icon', href: '/one.png'};
      expect(icons()).toStrictEqual([serverIcon]);
    });
  });

  it('accepts `sizes` as a string', () => {
    const links = new BrowserHeadElements('link');

    links.add({rel: 'icon', href: '/32.png', sizes: '32x32'});

    expect(icons()[0]!.getAttribute('sizes')).toBe('32x32');
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

function addLink(attributes: Record<string, string>) {
  const element = document.createElement('link');
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }
  document.head.append(element);
  return element;
}

function icons() {
  return Array.from(
    document.head.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'),
  );
}

function settle() {
  return new Promise<void>((resolve) => queueMicrotask(resolve));
}
