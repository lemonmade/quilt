/**
 * Get the matching DOM node for a component
 * @param {import('./internal').Component} component
 * @returns {import('./internal').PreactElement | null}
 */
export function findDOMNode(component) {
  return (
    (component &&
      (component.base || (component.nodeType === 1 && component))) ||
    null
  );
}
