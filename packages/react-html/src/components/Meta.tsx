import {useMeta} from '../hooks';

export function Meta(options: Parameters<typeof useMeta>[0]) {
  useMeta(options);
  return null;
}
