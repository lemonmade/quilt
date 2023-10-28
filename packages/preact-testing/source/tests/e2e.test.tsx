// @vitest-environment jsdom
/* eslint no-console: off */

import {describe, it, expect} from 'vitest';

import {h, Component, Fragment} from 'preact';
import {useState} from 'preact/hooks';

import {render} from '../index.ts';

describe('e2e', () => {
  it('throws if an Preact component throws during render', () => {
    const error = new Error('oh no!');

    function ThrowingComponent() {
      throw error;
      return null;
    }

    expect(() => render(h(ThrowingComponent, {}))).toThrowError(error);
  });

  it.only('throws if a Preact component throws after an update', () => {
    const error = new Error('oh no!');

    function ThrowingComponent() {
      const [shouldThrow, setShouldThrow] = useState(false);

      if (shouldThrow) throw error;

      return h(
        'button',
        {
          onClick() {
            setShouldThrow(true);
          },
        },
        'Throw!',
      );
    }

    const throwingComponent = render(h(ThrowingComponent, {}));

    expect(() =>
      throwingComponent.find('button')!.trigger('onClick'),
    ).toThrowError(error);
  });

  it('does not throw an error when an intermediate error boundary intercepts the error', () => {
    const error = new Error('oh no!');

    class ErrorBoundary extends Component<{children?: any}> {
      state: {error?: Error} = {};

      static getDerivedStateFromError(error: any) {
        return {error};
      }

      render({children}: this['props'], {error}: this['state']) {
        return error ? null : h(Fragment, {}, children);
      }
    }

    function ThrowingComponent() {
      throw error;
      return null;
    }

    expect(() =>
      render(h(ErrorBoundary, {}, h(ThrowingComponent, {}))),
    ).not.toThrowError();
  });
});
