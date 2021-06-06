import {cloneElement as preactCloneElement} from 'preact';
import {isValidElement} from './valid-element';

/**
 * Wrap `cloneElement` to abort if the passed element is not a valid element and apply
 * all vnode normalizations.
 * @param {import('./internal').VNode} element The vnode to clone
 * @param {object} props Props to add when cloning
 * @param {Array<import('./internal').ComponentChildren>} rest Optional component children
 */
export function cloneElement(element) {
  if (!isValidElement(element)) return element;
  return preactCloneElement.apply(null, arguments);
}
