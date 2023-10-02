import {CacheControl} from '@quilted/quilt/http';

export function Headers() {
  return <CacheControl cache={false} />;
}
