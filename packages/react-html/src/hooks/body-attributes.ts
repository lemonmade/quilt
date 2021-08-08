/* eslint react-hooks/exhaustive-deps: off */

import type {HTMLProps} from 'react';
import {useDomEffect} from './dom-effect';

/**
 * Sets the provided attributes on the `<body>` element.
 */
export function useBodyAttributes(bodyAttributes: HTMLProps<HTMLBodyElement>) {
  useDomEffect(
    (manager) => manager.addBodyAttributes(bodyAttributes),
    [JSON.stringify(bodyAttributes)],
  );
}
