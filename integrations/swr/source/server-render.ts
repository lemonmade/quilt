import {createContext} from 'react';
import type {ServerActionKind} from '@quilted/quilt';
import type {Fetcher as SWRFetcher, Key as SWRKey} from 'swr';

export const SERVER_ACTION_KIND = Symbol.for('Quilted.SWR');

export interface SWRServerRenderer {
  readonly kind: ServerActionKind;
  run<Data = unknown>(key: SWRKey, fetcher: SWRFetcher<Data>): Promise<Data>;
  extract(): Promise<Record<string, unknown>> | Record<string, unknown>;
}

export const SWRServerRendererContext = createContext<SWRServerRenderer | null>(
  null,
);
