/* eslint react-hooks/exhaustive-deps: off */

import type {HtmlManager} from '../manager.ts';
import {useDomEffect} from './dom-effect.ts';

type FirstArgument<T> = T extends (arg: infer U, ...rest: any[]) => any
  ? U
  : never;

/**
 * Sets the provided attributes on the `<html>` element.
 */
export function useHtmlAttributes(
  htmlAttributes: FirstArgument<HtmlManager['addHtmlAttributes']>,
) {
  useDomEffect(
    (manager) => manager.addHtmlAttributes(htmlAttributes),
    [JSON.stringify(htmlAttributes)],
  );
}
