import {Viewport, SearchRobots} from '@quilted/quilt/html';
import {describe, it, expect} from '@quilted/quilt/testing';

import {mountWithAppContext} from '~/tests/mount';

import {Head} from './Head';

describe('<Head />', () => {
  it('includes a responsive viewport tag', async () => {
    const head = await mountWithAppContext(<Head />);

    expect(head).toContainReactComponent(Viewport, {
      cover: true,
    });
  });

  it('prevents search robots from indexing the application', async () => {
    const head = await mountWithAppContext(<Head />);

    expect(head).toContainReactComponent(SearchRobots, {
      index: false,
      follow: false,
    });
  });
});
