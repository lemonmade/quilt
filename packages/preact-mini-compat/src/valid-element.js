import {REACT_ELEMENT_TYPE} from './render';

/**
 * Check if the passed element is a valid (p)react node.
 * @param {*} element The element to check
 * @returns {boolean}
 */
export function isValidElement(element) {
	return !!element && element.$$typeof === REACT_ELEMENT_TYPE;
}
