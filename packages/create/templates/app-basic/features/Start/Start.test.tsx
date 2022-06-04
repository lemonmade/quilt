import {describe, it, expect} from '@quilted/quilt/testing';

import {mountWithAppContext} from '~/tests/mount';

import {Start} from './Start';

describe('<Start />', () => {
  it('includes a welcome message', () => {
    const start = mountWithAppContext(<Start />);
    expect(start).toContainReactText('Hello world!');
  });
});
