/* eslint react-hooks/exhaustive-deps: off */

import type {HtmlManager} from '../manager';
import {useDomEffect} from './dom-effect';

type FirstArgument<T> = T extends (arg: infer U, ...rest: any[]) => any
  ? U
  : never;

export function useBodyAttributes(
  bodyAttributes: FirstArgument<HtmlManager['addBodyAttributes']>,
) {
  useDomEffect(
    (manager) => manager.addBodyAttributes(bodyAttributes),
    [JSON.stringify(bodyAttributes)],
  );
}
