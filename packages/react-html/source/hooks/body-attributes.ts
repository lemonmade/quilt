import type {HTMLProps} from 'react';
import {useDomEffect} from './dom-effect.ts';

/**
 * Sets the provided attributes on the `<body>` element.
 */
export function useBodyAttributes(bodyAttributes: HTMLProps<HTMLBodyElement>) {
  useDomEffect(
    (manager) => manager.addBodyAttributes(bodyAttributes),
    [JSON.stringify(bodyAttributes)],
  );
}
