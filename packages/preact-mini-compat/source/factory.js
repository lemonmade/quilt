import {createElement} from 'preact';

/**
 * Legacy version of createElement.
 * @param {import('./internal').VNode["type"]} type The node name or Component constructor
 */
export function createFactory(type) {
  return createElement.bind(null, type);
}
