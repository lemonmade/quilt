import {describe, it, expect} from '@quilted/quilt/testing';

import {renderApp} from '~/tests/render.ts';

import Start from './Start.tsx';

describe('<Start />', () => {
  it('includes a welcome message', async () => {
    const start = await renderApp(<Start />);
    expect(start).toContainReactText('Hello world!');
  });
});
