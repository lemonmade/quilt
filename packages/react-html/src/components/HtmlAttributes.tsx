import {useHtmlAttributes} from '../hooks';

type Props = Parameters<typeof useHtmlAttributes>[0];

/**
 * Sets the provided attributes on the `<html>` element.
 */
export function HtmlAttributes(props: Props) {
  useHtmlAttributes(props);
  return null;
}
