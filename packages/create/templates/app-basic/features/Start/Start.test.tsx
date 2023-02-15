import {describe, it, expect} from '@quilted/quilt/testing';

import {renderWithAppContext} from '~/tests/render';

import Start from './Start';

describe('<Start />', () => {
  it('includes a welcome message', async () => {
    const start = await renderWithAppContext(<Start />);
    expect(start).toContainReactText('Hello world!');
  });
});
