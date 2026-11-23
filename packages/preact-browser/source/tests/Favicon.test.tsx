// @vitest-environment jsdom

import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {render as preactRender} from 'preact';
import {act} from 'preact/test-utils';
import {signal} from '@quilted/signals';
import {BrowserHeadElements, type BrowserDetails} from '@quilted/browser';

import {render} from '../browser.tsx';
import {Favicon, type FaviconIcon} from '../components/Favicon.tsx';

describe('<Favicon icons />', () => {
  let container: HTMLElement;
  let browser: BrowserDetails;

  beforeEach(() => {
    document.head.innerHTML = '';
    container = document.createElement('div');
    document.body.append(container);
    browser = {links: new BrowserHeadElements('link')} as any;
  });

  afterEach(() => {
    act(() => {
      preactRender(null, container);
    });
    container.remove();
  });

  function mount(element: preact.ComponentChild) {
    act(() => {
      render(element, {element: container, browser});
    });
  }

  it('adds a link for each icon', () => {
    mount(
      <Favicon
        icons={[
          {source: '/16.png', sizes: '16x16', type: 'image/png'},
          {source: '/32.png', sizes: '32x32', type: 'image/png'},
          {source: '/touch.png', rel: 'apple-touch-icon'},
        ]}
      />,
    );

    expect(iconLinks()).toStrictEqual([
      {rel: 'icon', href: '/16.png', sizes: '16x16', type: 'image/png'},
      {rel: 'icon', href: '/32.png', sizes: '32x32', type: 'image/png'},
      {rel: 'apple-touch-icon', href: '/touch.png'},
    ]);
  });

  it('replaces every link in the set when any icon changes', () => {
    mount(
      <Favicon
        icons={[
          {source: '/a-16.png', sizes: '16x16'},
          {source: '/a-touch.png', rel: 'apple-touch-icon'},
        ]}
      />,
    );

    const before = Array.from(document.head.querySelectorAll('link'));

    mount(
      <Favicon
        icons={[
          {source: '/b-16.png', sizes: '16x16'},
          {source: '/a-touch.png', rel: 'apple-touch-icon'},
        ]}
      />,
    );

    const after = Array.from(document.head.querySelectorAll('link'));

    expect(after).toHaveLength(2);
    for (const link of before) {
      expect(link.isConnected).toBe(false);
      expect(after).not.toContain(link);
    }
    expect(iconLinks().map((link) => link.href)).toStrictEqual([
      '/b-16.png',
      '/a-touch.png',
    ]);
  });

  it('replaces the set when a signal of icons changes', () => {
    const icons = signal<readonly FaviconIcon[]>([
      {source: '/a.png'},
      {source: '/a-32.png', sizes: '32x32'},
    ]);

    mount(<Favicon icons={icons} />);

    icons.value = [{source: '/b.png'}];

    expect(iconLinks()).toStrictEqual([{rel: 'icon', href: '/b.png'}]);
  });

  it('removes the links when unmounted', () => {
    mount(<Favicon icons={[{source: '/a.png'}]} />);
    mount(null);

    expect(document.head.querySelectorAll('link')).toHaveLength(0);
  });
});

function iconLinks() {
  return Array.from(document.head.querySelectorAll('link')).map((link) =>
    Object.fromEntries(
      link.getAttributeNames().map((name) => [name, link.getAttribute(name)]),
    ),
  );
}
