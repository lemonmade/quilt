import {describe, it, expect} from '@quilted/testing';
import {run} from '..';

describe('package', () => {
  it('returns something fun', () => {
    expect(run()).toContain('fun');
  });
});
