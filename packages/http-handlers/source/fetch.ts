import {createHeaders} from '@quilted/http';

import type {NavigateTo} from './types';
import {resolveTo} from './utilities';

export async function fetchJson<T = unknown>(
  url: Exclude<NavigateTo, (...args: any[]) => any>,
  body: any,
  {
    headers: explicitHeaders,
    ...options
  }: Omit<RequestInit, 'body' | 'method'> = {},
): Promise<T> {
  const headers = createHeaders(explicitHeaders);

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(resolveTo(url), {
    method: 'POST',
    body: JSON.stringify(body),
    headers: headers as any,
    ...options,
  });

  const result = await response.json();

  return result as T;
}