import {describe, it, expect} from '@quilted/quilt/testing';

import {renderWithAppContext} from '~/tests/render.tsx';

import Start from './Start.tsx';

describe('<Start />', () => {
  it('includes a welcome message', async () => {
    const start = await renderWithAppContext(<Start />);
    expect(start).toContainReactText('Hello world!');
  });
});
