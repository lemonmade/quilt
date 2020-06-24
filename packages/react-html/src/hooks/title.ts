import {useDomEffect} from './dom-effect';

export function useTitle(title: string) {
  useDomEffect((manager) => manager.addTitle(title), [title]);
}
