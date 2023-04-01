import {useDomEffect} from './dom-effect.ts';

/**
 * Adds a `<title>` tag to the `<head>` of the document with the
 * provided attributes. If you want to conditionally disable or
 * remove the tag, you can instead pass `false` to this hook. When
 * more than one `useTitle()` (or `<Title />`) exists in your
 * application, the one that runs most deeply in your React tree
 * is used.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Document/title
 */
export function useTitle(title: false | string) {
  useDomEffect(
    (manager) => {
      if (title) return manager.addTitle(title);
    },
    [title],
  );
}
