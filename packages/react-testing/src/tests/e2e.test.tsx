/* eslint no-console: off */

import {Component, useState} from 'react';
import {mount} from '..';

describe('e2e', () => {
  let consoleError = console.error;

  beforeEach(() => {
    consoleError = console.error;

    // React logs these errors no matter what, even though we
    // catch the error in the test runner.
    console.error = (...args: any[]) => {
      if (
        typeof args[0] === 'string' &&
        args[0].includes('<ThrowingComponent>')
      ) {
        return;
      }

      return consoleError.call(console, ...args);
    };
  });

  afterEach(() => {
    console.error = consoleError;
  });

  it('throws if an React component throws during mount', () => {
    const error = new Error('oh no!');

    function ThrowingComponent() {
      throw error;
      return null;
    }

    expect(() => mount(<ThrowingComponent />)).toThrowError(error);
  });

  it('throws if a React component throws after an update', () => {
    const error = new Error('oh no!');

    function ThrowingComponent() {
      const [shouldThrow, setShouldThrow] = useState(false);

      if (shouldThrow) throw error;

      return <button onClick={() => setShouldThrow(true)}>Throw!</button>;
    }

    const throwingComponent = mount(<ThrowingComponent />);

    expect(() =>
      throwingComponent.find('button')!.trigger('onClick'),
    ).toThrowError(error);
  });

  it('does not throw an error when an intermediate error boundary intercepts the error', () => {
    const error = new Error('oh no!');

    class ErrorBoundary extends Component {
      state: {error?: Error} = {};

      static getDerivedStateFromError(error: any) {
        return {error};
      }

      render() {
        return this.state.error ? null : <>{this.props.children}</>;
      }
    }

    function ThrowingComponent() {
      throw error;
      return null;
    }

    expect(() =>
      mount(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>,
      ),
    ).not.toThrowError();
  });
});
