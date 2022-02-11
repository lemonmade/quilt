import {usePreloadRoute} from '../hooks';
import type {NavigateTo} from '../types';

interface Props {
  to: NavigateTo;
}

export function PreloadRoute({to}: Props) {
  usePreloadRoute(to);
  return null;
}
