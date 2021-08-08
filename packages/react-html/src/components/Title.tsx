import {useTitle} from '../hooks';

/**
 * Adds a `<title>` tag to the `<head>` of the document with the
 * provided attributes. When more than one `<Title />` (or `useTitle()`)
 * exists in your application, the one that runs most deeply in your
 * React tree is used.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Document/title
 */
export function Title({children}: {children: string}) {
  useTitle(children);
  return null;
}
