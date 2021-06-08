/* eslint react-hooks/exhaustive-deps: off */

import type {HTMLProps} from 'react';
import {useDomEffect} from './dom-effect';

export function useLink(link: HTMLProps<HTMLLinkElement>) {
  useDomEffect((manager) => manager.addLink(link), [JSON.stringify(link)]);
}
