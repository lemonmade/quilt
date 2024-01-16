import {describe, it, expect} from 'vitest';

import {run} from './index.ts';

describe('run()', () => {
  it('returns something fun', () => {
    expect(run()).toContain('fun');
  });
});
