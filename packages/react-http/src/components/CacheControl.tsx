import {useCacheControl} from '../hooks';

type Props = Exclude<Parameters<typeof useCacheControl>[0], string>;

export function CacheControl(options: Props) {
  useCacheControl(options);
  return null;
}
