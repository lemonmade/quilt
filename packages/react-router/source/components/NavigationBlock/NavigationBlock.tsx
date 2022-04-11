import {useNavigationBlock} from '../../hooks';
import type {Blocker} from '../../types';

interface Props {
  onNavigation?: Blocker;
}

export function NavigationBlock({onNavigation}: Props) {
  useNavigationBlock(onNavigation);
  return null;
}
