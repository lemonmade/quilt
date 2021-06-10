import type {GraphQLOperation} from '@quilted/graphql';
import {
  useAsync,
  createAsyncLoader,
  AsyncLoaderOptions,
} from '@quilted/react-async';

import type {AsyncQuery} from './types';
import {AsyncLoaderLoad} from '@quilted/async/src';

export interface Options extends AsyncLoaderOptions {}

export function createAsyncQuery<Data, Variables>(
  load: AsyncLoaderLoad<GraphQLOperation<Data, Variables>>,
  {id}: Options,
): AsyncQuery<Data, Variables> {
  const query: AsyncQuery<Data, Variables> = {} as any;
  const asyncLoader = createAsyncLoader(load, {id});

  Reflect.defineProperty(query, 'loader', {
    value: asyncLoader,
    writable: false,
  });

  Reflect.defineProperty(query, 'usePreload', {
    value: usePreload,
    writable: false,
  });

  return query;

  function usePreload() {
    return useAsync(asyncLoader, {scripts: 'preload'}).load;
  }
}
