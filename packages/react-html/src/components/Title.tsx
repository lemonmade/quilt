import {useTitle} from '../hooks';

export function Title({children}: {children: string}) {
  useTitle(children);
  return null;
}
