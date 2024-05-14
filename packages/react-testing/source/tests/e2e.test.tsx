import {Component, useState, useContext, createContext} from 'react';
import * as React from 'react';
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {
  render,
  createRender,
  type CustomRenderOptions,
} from '../implementations/test-renderer.ts';

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

  describe('options', () => {
    type ColorScheme = 'dark' | 'light';

    const ColorSchemeContext = createContext<ColorScheme>('light');

    interface Options {
      colorScheme?: ColorScheme;
    }

    function useColorScheme() {
      return useContext(ColorSchemeContext);
    }

    function ColorThemedComponent() {
      return <p>Color scheme: {useColorScheme()}</p>;
    }

    it('gets access to options when rendering', () => {
      const renderSpy = vi.fn((element, _, {colorScheme = 'light'}) => {
        return (
          <ColorSchemeContext.Provider value={colorScheme}>
            {element}
          </ColorSchemeContext.Provider>
        );
      }) satisfies CustomRenderOptions<Options>['render'];

      const renderWithColorScheme = createRender<Options>({
        render: renderSpy,
      });

      const renderedWithDefaultTheme = renderWithColorScheme(
        <ColorThemedComponent />,
      );

      const renderedWithDarkTheme = renderWithColorScheme(
        <ColorThemedComponent />,
        {colorScheme: 'dark'},
      );

      expect(renderSpy).toHaveBeenNthCalledWith(
        1,
        expect.anything(),
        expect.anything(),
        expect.not.objectContaining({colorScheme: expect.any(String)}),
      );

      expect(renderSpy).toHaveBeenNthCalledWith(
        2,
        expect.anything(),
        expect.anything(),
        {colorScheme: 'dark'},
      );

      expect(renderedWithDefaultTheme.text).toBe('Color scheme: light');
      expect(renderedWithDarkTheme.text).toBe('Color scheme: dark');
    });

    it('can override options in an extended render function', () => {
      const renderWithColorScheme = createRender<
        Options & {highContrast?: boolean}
      >({
        render(element, _, {colorScheme = 'light'}) {
          return (
            <ColorSchemeContext.Provider value={colorScheme}>
              {element}
            </ColorSchemeContext.Provider>
          );
        },
      });

      const optionsSpy = vi.fn(() => ({colorScheme: 'dark' as ColorScheme}));

      const renderWithDarkColorScheme = renderWithColorScheme.extend<Options>({
        options: optionsSpy,
      });

      const renderedWithDarkTheme = renderWithDarkColorScheme(
        <ColorThemedComponent />,
        {highContrast: true},
      );

      expect(optionsSpy).toHaveBeenCalledWith({highContrast: true});

      expect(renderedWithDarkTheme.text).toBe('Color scheme: dark');

      expect(renderWithDarkColorScheme.hook(() => useColorScheme()).value).toBe(
        'dark',
      );
    });
  });
});
