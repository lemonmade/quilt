import {CacheControl} from '@quilted/quilt/http';

export function Http() {
  return <CacheControl cache={false} />;
}
