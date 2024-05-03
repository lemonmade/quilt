import type {PropsWithChildren} from 'react';

import {Title} from '@quilted/quilt/browser';
import {CacheControl} from '@quilted/quilt/server';

export function HTML({children}: PropsWithChildren<{}>) {
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
