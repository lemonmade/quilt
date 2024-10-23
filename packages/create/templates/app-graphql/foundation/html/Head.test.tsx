import {describe, it, expect} from 'vitest';
import {Title, Favicon} from '@quilted/quilt/browser';
import {SearchRobots, Viewport} from '@quilted/quilt/server';

import {renderApp} from '~/tests/render.ts';

import {Head} from './Head.tsx';

describe('<Head />', () => {
  it('sets the default title', async () => {
    const head = await renderApp(<Head />);

    expect(head).toContainPreactComponent(Title, {
      children: 'App',
    });
  });

  it('uses a fun, emoji favicon', async () => {
    const head = await renderApp(<Head />);

    expect(head).toContainPreactComponent(Favicon, {
      emoji: '🧶',
    });
  });

  it('includes a responsive viewport tag', async () => {
    const head = await renderApp(<Head />);

    expect(head).toContainPreactComponent(Viewport, {
      cover: true,
    });
  });

  it('prevents search robots from indexing the application', async () => {
    const head = await renderApp(<Head />);

    expect(head).toContainPreactComponent(SearchRobots, {
      index: false,
      follow: false,
    });
  });
});
