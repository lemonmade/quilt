/* eslint no-console: off */

import {Component, useState} from 'react';
import {describe, it, expect, beforeEach, afterEach} from '@quilted/testing';
import {render} from '..';

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

  it('throws if an React component throws during render', () => {
    const error = new Error('oh no!');

    function ThrowingComponent() {
      throw error;
      return null;
    }

    expect(() => render(<ThrowingComponent />)).toThrowError(error);
  });

  it('throws if a React component throws after an update', () => {
    const error = new Error('oh no!');

    function ThrowingComponent() {
      const [shouldThrow, setShouldThrow] = useState(false);

      if (shouldThrow) throw error;

      return <button onClick={() => setShouldThrow(true)}>Throw!</button>;
    }

    const throwingComponent = render(<ThrowingComponent />);

    expect(() =>
      throwingComponent.find('button')!.trigger('onClick'),
    ).toThrowError(error);
  });

  it('does not throw an error when an intermediate error boundary intercepts the error', () => {
    const error = new Error('oh no!');

    class ErrorBoundary extends Component<{children: any}> {
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
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>,
      ),
    ).not.toThrowError();
  });
});
