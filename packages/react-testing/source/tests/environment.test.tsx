import {useState} from 'react';
import {describe, it, expect} from '@quilted/testing';
import {render} from '../implementations/test-renderer.ts';

describe('render()', () => {
  describe('hook()', () => {
    it('provides the current hook return value', () => {
      const initialState = 1;
      const hookRunner = render.hook(() => useState(initialState));
      expect(hookRunner).toHaveProperty('current', [
        initialState,
        expect.any(Function),
      ]);
    });

    it('provides an act() method that is called with the current hook value, and resolves all pending updates', () => {
      const initialState = 1;
      const hookRunner = render.hook(() => useState(initialState));

      hookRunner.act(([, setState]) => setState(initialState + 1));

      expect(hookRunner).toHaveProperty('current.0', initialState + 1);
    });
  });
});
