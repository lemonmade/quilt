import type {RenderableProps} from 'preact';

import {Title} from '@quilted/quilt/browser';
import {CacheControl} from '@quilted/quilt/server';

export function HTML({children}: RenderableProps<{}>) {
  return (
    <>
      <Headers />
      <Head />
      {children}
    </>
  );
}

function Head() {
  return <Title>App</Title>;
}

function Headers() {
  return <CacheControl cache={false} />;
}
