/* eslint react-hooks/exhaustive-deps: off */

import {useEffect, useContext} from 'react';
import type {HTMLManager} from '../manager.ts';
import {HTMLContext} from '../context.ts';

export function useDomClientEffect(
  perform: (manager: HTMLManager) => void,
  inputs: unknown[] = [],
) {
  const manager = useContext(HTMLContext);

  useEffect(() => {
    perform(manager);
  }, [manager, perform, ...inputs]);
}
