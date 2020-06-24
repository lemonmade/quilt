/* eslint react-hooks/exhaustive-deps: off */

import {useDomEffect} from './dom-effect';

export function useLink(link: React.HTMLProps<HTMLLinkElement>) {
  useDomEffect((manager) => manager.addLink(link), [JSON.stringify(link)]);
}
