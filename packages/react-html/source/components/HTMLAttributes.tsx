import {useHTMLAttributes} from '../hooks/html-attributes.ts';

type Props = Parameters<typeof useHTMLAttributes>[0];

/**
 * Sets the provided attributes on the `<html>` element.
 */
export function HTMLAttributes(props: Props) {
  useHTMLAttributes(props);
  return null;
}
