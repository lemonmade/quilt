import {useNavigationBlock} from '../hooks/navigation-block.ts';
import type {Blocker} from '../types.ts';

interface Props {
  onNavigation?: Blocker;
}

export function NavigationBlock({onNavigation}: Props) {
  useNavigationBlock(onNavigation);
  return null;
}
