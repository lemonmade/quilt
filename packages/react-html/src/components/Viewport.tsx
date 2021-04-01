import {useViewport} from '../hooks';

export function Viewport(options: Parameters<typeof useViewport>[0]) {
  useViewport(options);
  return null;
}
