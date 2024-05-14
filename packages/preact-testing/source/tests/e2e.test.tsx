// @vitest-environment jsdom

import {describe, it, expect, vi} from 'vitest';

import {h, Component, Fragment, createContext} from 'preact';
import {useContext, useState} from 'preact/hooks';

import {render, createRender, type CustomRenderOptions} from '../index.ts';

describe('e2e', () => {
  it('throws if an Preact component throws during render', () => {
    const error = new Error('oh no!');

    function ThrowingComponent() {
      throw error;
      return null;
    }

    expect(() => render(<ThrowingComponent />)).toThrowError(error);
  });

  it('throws if a Preact component throws after an update', () => {
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

    const throwingComponent = render(<ThrowingComponent />);

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
