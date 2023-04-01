import {useThemeColor} from '../hooks/theme-color.ts';

type Options = NonNullable<Parameters<typeof useThemeColor>[1]>;

export interface Props {
  /**
   * The theme-color to use, which supporting browsers will apply
   * to some elements of the UI.
   */
  value: string;

  /**
   * The color scheme that this theme color applies to. By default,
   * the theme color applies for all color schemes.
   */
  prefersColorScheme?: Options['prefersColorScheme'];
}

/**
 * Adds a `theme-color `<meta>` tag to the `<head>` of the document.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta/name/theme-color
 */
export function ThemeColor({value, prefersColorScheme}: Props) {
  useThemeColor(value, {prefersColorScheme});
  return null;
}
