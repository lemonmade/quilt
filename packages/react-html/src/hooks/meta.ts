/* eslint react-hooks/exhaustive-deps: off */

import type {HTMLProps} from 'react';
import {useDomEffect} from './dom-effect';

export function useMeta(meta: HTMLProps<HTMLMetaElement>) {
  useDomEffect((manager) => manager.addMeta(meta), [JSON.stringify(meta)]);
}
