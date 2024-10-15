import {
  computed,
  isSignal,
  resolveSignalOrValue,
  type ReadonlySignal,
} from '@quilted/signals';
import {useBrowserEffect} from './browser-effect.ts';

interface Options {
  /**
   * The color scheme that this theme color applies to. By default,
   * the theme color applies for all color schemes.
   */
  prefersColorScheme?: 'light' | 'dark';
}

/**
 * Adds a `theme-color` `<meta>` tag to the `<head>` of the document.
 * You can optionally pass the `prefersColorScheme` option, which can
 * be either `'light'` or `'dark'`, to limit this meta tag to specific
 * color schemes in browsers that support it.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta/name/theme-color
 */
export function useThemeColor(
  color: string | ReadonlySignal<string>,
  {prefersColorScheme}: Options,
) {
  useBrowserEffect(
    (browser) => {
      const meta = isSignal(color)
        ? computed(() =>
            createMeta(resolveSignalOrValue(color), prefersColorScheme),
          )
        : createMeta(color, prefersColorScheme);

      return browser.metas.add(meta);
    },
    [color, prefersColorScheme],
  );
}

function createMeta(
  color: string,
  prefersColorScheme?: Options['prefersColorScheme'],
) {
  const meta = {
    name: 'theme-color',
    content: color,
  };

  if (prefersColorScheme) {
    Object.assign(meta, {
      media: `(prefers-color-scheme: ${prefersColorScheme})`,
    });
  }

  return meta;
}
