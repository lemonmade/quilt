import {useState} from 'react';
import {mount} from '../implementations/test-renderer';

describe('mount()', () => {
  describe('hook()', () => {
    it('provides the current hook return value', () => {
      const initialState = 1;
      const hookRunner = mount.hook(() => useState(initialState));
      expect(hookRunner).toHaveProperty('current', [
        initialState,
        expect.any(Function),
      ]);
    });

    it('provides an act() method that is called with the current hook value, and resolves all pending updates', () => {
      const initialState = 1;
      const hookRunner = mount.hook(() => useState(initialState));

      hookRunner.act(([, setState]) => setState(initialState + 1));

      expect(hookRunner).toHaveProperty('current.0', initialState + 1);
    });
  });
});
