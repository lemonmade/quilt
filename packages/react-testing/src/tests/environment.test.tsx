import {useState, createContext} from 'react';
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

    it('child component is find-able', () => {
      function InnerComponent() {
        return null;
      }
      function RootComponent() {
        return <InnerComponent />;
      }
      const wrapper = mount(<RootComponent />);
      expect(wrapper.find(InnerComponent)).not.toBeNull();
    });

    it.only('child comntext component is find-able', () => {
      const ContextComponent = createContext('defaultValue');
      function InnerComponent() {
        return null;
      }

      function TestComponent() {
        return (
          <ContextComponent.Provider value="defaultValue">
            <InnerComponent />
          </ContextComponent.Provider>
        );
      }
      const wrapper = mount(<TestComponent />);
      expect(wrapper.find(ContextComponent.Provider)).not.toBeNull();
    });
  });
});
