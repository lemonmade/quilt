import {describe, it, expect} from '@quilted/quilt/testing';
import {Viewport, SearchRobots} from '@quilted/quilt/html';

import {renderApp} from '~/tests/render.tsx';

import {Head} from './Head.tsx';

describe('<Head />', () => {
  it('includes a responsive viewport tag', async () => {
    const head = await renderApp(<Head />);

    expect(head).toContainReactComponent(Viewport, {
      cover: true,
    });
  });

  it('prevents search robots from indexing the application', async () => {
    const head = await renderApp(<Head />);

    expect(head).toContainReactComponent(SearchRobots, {
      index: false,
      follow: false,
    });
  });
});
