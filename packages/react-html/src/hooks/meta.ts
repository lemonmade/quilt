/* eslint react-hooks/exhaustive-deps: off */

import {useDomEffect} from './dom-effect';

export function useMeta(meta: React.HTMLProps<HTMLMetaElement>) {
  useDomEffect((manager) => manager.addMeta(meta), [JSON.stringify(meta)]);
}
