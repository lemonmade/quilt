import {useNavigationBlock} from '../../hooks';

interface Props {
  onNavigation?: import('../../router').Blocker;
}

export function NavigationBlock({onNavigation}: Props) {
  useNavigationBlock(onNavigation);
  return null;
}
