import type {HTMLManager} from '../manager.ts';
import {useDomEffect} from './dom-effect.ts';

type FirstArgument<T> = T extends (arg: infer U, ...rest: any[]) => any
  ? U
  : never;

/**
 * Sets the provided attributes on the `<html>` element.
 */
export function useHTMLAttributes(
  htmlAttributes: FirstArgument<HTMLManager['addAttributes']>,
) {
  useDomEffect(
    (manager) => manager.addAttributes(htmlAttributes),
    [JSON.stringify(htmlAttributes)],
  );
}
