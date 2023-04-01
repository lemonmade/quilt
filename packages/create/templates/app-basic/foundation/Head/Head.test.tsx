import {Viewport, SearchRobots} from '@quilted/quilt/html';
import {describe, it, expect} from '@quilted/quilt/testing';

import {renderWithAppContext} from '~/tests/render.tsx';

import {Head} from './Head.tsx';

describe('<Head />', () => {
  it('includes a responsive viewport tag', async () => {
    const head = await renderWithAppContext(<Head />);

    expect(head).toContainReactComponent(Viewport, {
      cover: true,
    });
  });

  it('prevents search robots from indexing the application', async () => {
    const head = await renderWithAppContext(<Head />);

    expect(head).toContainReactComponent(SearchRobots, {
      index: false,
      follow: false,
    });
  });
});
