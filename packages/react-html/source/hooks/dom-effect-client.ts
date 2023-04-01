/* eslint react-hooks/exhaustive-deps: off */

import {useEffect, useContext} from 'react';
import type {HtmlManager} from '../manager.ts';
import {HtmlContext} from '../context.ts';

export function useDomClientEffect(
  perform: (manager: HtmlManager) => void,
  inputs: unknown[] = [],
) {
  const manager = useContext(HtmlContext);

  useEffect(() => {
    perform(manager);
  }, [manager, perform, ...inputs]);
}
