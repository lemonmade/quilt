import {useNavigationBlock} from '../../hooks';
import type {NavigationBlocker} from '../../types';

interface Props {
  onNavigation?: NavigationBlocker;
}

export function NavigationBlock({onNavigation}: Props) {
  useNavigationBlock(onNavigation);
  return null;
}
